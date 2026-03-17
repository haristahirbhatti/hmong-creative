import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 300;

// Two separate base URLs — this is what caused both 404 errors
const UPLOAD_BASE = 'https://kieai.redpandaai.co';
const API_BASE = 'https://api.kie.ai';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const imageFile = formData.get('image') as File | null;
        const audioFile = formData.get('audio') as File | null;
        const prompt = (formData.get('prompt') as string) || '';
        const model = (formData.get('model') as string) || 'standard';

        const apiKey = process.env.KIE_API_KEY;
        if (!apiKey) return NextResponse.json({ error: 'KIE_API_KEY not set' }, { status: 500 });
        if (!imageFile) return NextResponse.json({ error: 'Image file required' }, { status: 400 });
        if (!audioFile) return NextResponse.json({ error: 'Audio file required' }, { status: 400 });

        // ── Step 1: Upload files to kieai.redpandaai.co ────────────────────
        const uploadFile = async (file: File, path: string): Promise<string> => {
            const bytes = await file.arrayBuffer();
            const base64 = Buffer.from(bytes).toString('base64');

            const res = await fetch(
                // ✅ Correct upload URL
                `${UPLOAD_BASE}/api/file-base64-upload`,
                {
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
                },
            );

            const data = await res.json();
            const url =
                data?.data?.downloadUrl ||
                data?.data?.fileUrl ||
                data?.data?.url ||
                '';
            if (!url) throw new Error(`Upload failed: ${JSON.stringify(data).slice(0, 120)}`);
            return url;
        };

        console.log('Uploading files...');
        const [imageUrl, audioUrl] = await Promise.all([
            uploadFile(imageFile, 'image'),
            uploadFile(audioFile, 'audio'),
        ]);
        console.log('imageUrl:', imageUrl.slice(0, 80));
        console.log('audioUrl:', audioUrl.slice(0, 80));

        // ── Step 2: Create avatar task on api.kie.ai ───────────────────────
        // ✅ Correct model names: "kling/ai-avatar-standard" / "kling/ai-avatar-pro"
        const modelName = model === 'pro'
            ? 'kling/ai-avatar-pro'
            : 'kling/ai-avatar-standard';

        const createRes = await fetch(
            // ✅ Correct generate endpoint
            `${API_BASE}/api/v1/jobs/createTask`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                // ✅ Correct body shape: inputs nested under "input" key
                body: JSON.stringify({
                    model: modelName,
                    input: {
                        image_url: imageUrl,
                        audio_url: audioUrl,
                        prompt,
                    },
                }),
            },
        );

        const createData = await createRes.json();
        console.log('createTask response:', JSON.stringify(createData).slice(0, 300));

        if (createData.code !== 200 || !createData.data?.taskId) {
            return NextResponse.json(
                { error: createData.msg || 'Lip sync failed to start. Check API credits and that Kling Avatar is enabled on your kie.ai account.' },
                { status: 500 },
            );
        }

        const taskId: string = createData.data.taskId;
        console.log('taskId:', taskId);

        // ── Step 3: Poll for result ────────────────────────────────────────
        // ✅ Correct poll URL: GET /api/v1/jobs/recordInfo?taskId=...
        // ✅ Video URL lives inside data.resultJson (a JSON string)
        for (let i = 0; i < 60; i++) {
            await new Promise((r) => setTimeout(r, 5000));

            let poll: Record<string, unknown>;
            try {
                const pollRes = await fetch(
                    `${API_BASE}/api/v1/jobs/recordInfo?taskId=${taskId}`,
                    { headers: { Authorization: `Bearer ${apiKey}` } },
                );
                poll = await pollRes.json();
            } catch {
                console.log(`Poll ${i + 1} error — retrying`);
                continue;
            }

            if (i < 3) console.log(`Poll #${i + 1}:`, JSON.stringify(poll).slice(0, 300));

            const d = poll?.data as Record<string, unknown> | undefined;
            if (!d) continue;

            const state = d.state as string | undefined;

            if (state === 'fail') {
                return NextResponse.json(
                    { error: `Generation failed: ${d.failMsg || d.failCode || 'unknown error'}` },
                    { status: 500 },
                );
            }

            if (state === 'success') {
                let videoUrl = '';
                try {
                    // resultJson is a string like: '{"resultUrls":["https://...mp4"]}'
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
                    console.log('Done! videoUrl:', videoUrl.slice(0, 80));
                    return NextResponse.json({ videoUrl });
                }
            }
            // state: waiting / queuing / generating — keep polling
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