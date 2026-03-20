import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 300;

const UPLOAD_BASE = 'https://kieai.redpandaai.co';
const API_BASE = 'https://api.kie.ai';

// ✅ Vercel body size limits:
// Raw file: image 2MB + audio 1MB = 3MB
// After base64 encoding (+33%): ~4MB — stays under Vercel's 4.5MB hard limit
const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB
const MAX_AUDIO_BYTES = 1 * 1024 * 1024; // 1MB

export async function POST(req: NextRequest) {
    try {
        let formData: FormData;
        try {
            formData = await req.formData();
        } catch (e) {
            console.error('FormData error:', e);
            return NextResponse.json({ error: 'Files too large — image max 2MB, audio max 1MB' }, { status: 400 });
        }

        const imageFile = formData.get('image') as File | null;
        const audioFile = formData.get('audio') as File | null;
        const prompt = (formData.get('prompt') as string) || '';
        const model = (formData.get('model') as string) || 'standard';

        const apiKey = process.env.KIE_API_KEY;
        if (!apiKey) return NextResponse.json({ error: 'KIE_API_KEY not set' }, { status: 500 });
        if (!imageFile) return NextResponse.json({ error: 'Image file required' }, { status: 400 });
        if (!audioFile) return NextResponse.json({ error: 'Audio file required' }, { status: 400 });

        // ✅ Strict size checks — must pass before base64 encoding
        if (imageFile.size > MAX_IMAGE_BYTES) {
            return NextResponse.json({
                error: `Image is ${(imageFile.size / 1024 / 1024).toFixed(1)}MB — max 2MB allowed. Please compress your image and try again.`
            }, { status: 400 });
        }
        if (audioFile.size > MAX_AUDIO_BYTES) {
            return NextResponse.json({
                error: `Audio is ${(audioFile.size / 1024 / 1024).toFixed(1)}MB — max 1MB allowed. Please trim or compress your audio and try again.`
            }, { status: 400 });
        }

        // ── Step 1: Upload files to kieai.redpandaai.co ───────────────────
        const uploadFile = async (file: File, path: string): Promise<string> => {
            const bytes = await file.arrayBuffer();
            const base64 = Buffer.from(bytes).toString('base64');

            let res: Response;
            try {
                res = await fetch(`${UPLOAD_BASE}/api/file-base64-upload`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        base64Data: `data:${file.type};base64,${base64}`,
                        uploadPath: path,
                        fileName: `${path}-${Date.now()}.${file.name.split('.').pop() || 'bin'}`,
                    }),
                });
            } catch (e) {
                throw new Error(`Upload network error: ${e instanceof Error ? e.message : String(e)}`);
            }

            const text = await res.text();
            let data: Record<string, unknown>;
            try {
                data = JSON.parse(text);
            } catch {
                console.error(`Upload not JSON (${path}):`, text.slice(0, 200));
                throw new Error(`Upload failed — server returned: ${text.slice(0, 100)}`);
            }

            const url =
                (data?.data as Record<string, unknown>)?.downloadUrl ||
                (data?.data as Record<string, unknown>)?.fileUrl ||
                (data?.data as Record<string, unknown>)?.url ||
                (data as Record<string, unknown>)?.downloadUrl ||
                '';
            if (!url) throw new Error(`Upload failed: ${JSON.stringify(data).slice(0, 120)}`);
            return url as string;
        };

        console.log('Uploading files...');
        let imageUrl: string, audioUrl: string;
        try {
            [imageUrl, audioUrl] = await Promise.all([
                uploadFile(imageFile, 'image'),
                uploadFile(audioFile, 'audio'),
            ]);
        } catch (e) {
            return NextResponse.json(
                { error: e instanceof Error ? e.message : 'File upload failed' },
                { status: 500 },
            );
        }
        console.log('imageUrl:', imageUrl.slice(0, 80));
        console.log('audioUrl:', audioUrl.slice(0, 80));

        // ── Step 2: Create avatar task ─────────────────────────────────────
        const modelName = model === 'pro'
            ? 'kling/ai-avatar-pro'
            : 'kling/ai-avatar-standard';

        let createRes: Response;
        try {
            createRes = await fetch(`${API_BASE}/api/v1/jobs/createTask`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: modelName,
                    input: { image_url: imageUrl, audio_url: audioUrl, prompt },
                }),
            });
        } catch (e) {
            return NextResponse.json(
                { error: `Network error: ${e instanceof Error ? e.message : String(e)}` },
                { status: 500 },
            );
        }

        const createText = await createRes.text();
        let createData: Record<string, unknown>;
        try {
            createData = JSON.parse(createText);
        } catch {
            console.error('createTask not JSON:', createText.slice(0, 200));
            return NextResponse.json(
                { error: `Server error: ${createText.slice(0, 100)}` },
                { status: 500 },
            );
        }

        console.log('createTask response:', JSON.stringify(createData).slice(0, 300));

        if (createData.code !== 200 || !(createData.data as Record<string, unknown>)?.taskId) {
            return NextResponse.json(
                { error: (createData.msg as string) || 'Lip sync failed to start. Check API credits and that Kling Avatar is enabled on your kie.ai account.' },
                { status: 500 },
            );
        }

        const taskId = (createData.data as Record<string, unknown>).taskId as string;
        console.log('taskId:', taskId);

        // ── Step 3: Poll for result ────────────────────────────────────────
        for (let i = 0; i < 60; i++) {
            await new Promise(r => setTimeout(r, 5000));

            let pollText: string;
            try {
                const pollRes = await fetch(
                    `${API_BASE}/api/v1/jobs/recordInfo?taskId=${taskId}`,
                    { headers: { Authorization: `Bearer ${apiKey}` } },
                );
                pollText = await pollRes.text();
            } catch {
                console.log(`Poll ${i + 1} network error — retrying`);
                continue;
            }

            let poll: Record<string, unknown>;
            try {
                poll = JSON.parse(pollText);
            } catch {
                console.log(`Poll ${i + 1} not JSON:`, pollText.slice(0, 100));
                continue;
            }

            if (i < 3) console.log(`Poll #${i + 1}:`, JSON.stringify(poll).slice(0, 300));

            const d = poll?.data as Record<string, unknown> | undefined;
            if (!d) continue;

            const state = d.state as string | undefined;
            console.log(`Poll #${i + 1} state:${state}`);

            if (state === 'fail') {
                return NextResponse.json(
                    { error: `Generation failed: ${d.failMsg || d.failCode || 'unknown error'}` },
                    { status: 500 },
                );
            }

            if (state === 'success') {
                let videoUrl = '';
                try {
                    const result = JSON.parse(d.resultJson as string);
                    videoUrl =
                        result?.resultUrls?.[0] ||
                        result?.videoUrl ||
                        result?.video_url ||
                        '';
                } catch {
                    console.log('Could not parse resultJson:', d.resultJson);
                }

                if (videoUrl) {
                    console.log('Done! videoUrl:', (videoUrl as string).slice(0, 80));
                    return NextResponse.json({ videoUrl });
                }
            }
            // waiting / queuing / generating — keep polling
        }

        return NextResponse.json(
            { error: 'Timeout — generation took too long, please try again' },
            { status: 408 },
        );

    } catch (e: unknown) {
        console.error('Lip sync error:', e);
        return NextResponse.json(
            { error: e instanceof Error ? e.message : 'Server error' },
            { status: 500 },
        );
    }
}