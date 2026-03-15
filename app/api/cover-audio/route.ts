import { NextRequest, NextResponse } from 'next/server';

export const config = {
    api: { bodyParser: false },
};

export async function POST(req: NextRequest) {
    try {
        let formData: FormData;
        try {
            formData = await req.formData();
        } catch (e) {
            console.error('FormData parse error:', e);
            return NextResponse.json({ error: 'File too large or invalid format. Please use MP3/WAV under 10MB.' }, { status: 400 });
        }

        const audioFile = formData.get('audio') as File | null;
        const audioUrl = formData.get('audioUrl') as string || '';
        const style = formData.get('style') as string || '';

        const apiKey = process.env.KIE_API_KEY;
        if (!apiKey) return NextResponse.json({ error: 'KIE_API_KEY not set' }, { status: 500 });

        // Validate file size (max 10MB)
        if (audioFile && audioFile.size > 10 * 1024 * 1024) {
            return NextResponse.json({ error: 'Audio file too large. Please use a file under 10MB.' }, { status: 400 });
        }

        // Step 1: Upload audio file
        let uploadUrl = audioUrl;
        if (audioFile && !uploadUrl) {
            const bytes = await audioFile.arrayBuffer();
            const base64 = Buffer.from(bytes).toString('base64');

            const uploadRes = await fetch('https://kieai.redpandaai.co/api/file-base64-upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    base64Data: `data:${audioFile.type || 'audio/mpeg'};base64,${base64}`,
                    uploadPath: 'audio',
                    fileName: `cover-${Date.now()}.mp3`,
                }),
            });

            // Safe JSON parse
            let uploadData;
            try {
                uploadData = await uploadRes.json();
            } catch {
                const text = await uploadRes.text().catch(() => 'unknown');
                console.error('Upload response not JSON:', text.slice(0, 200));
                return NextResponse.json({ error: `File upload failed: server returned invalid response` }, { status: 500 });
            }

            console.log('Upload response:', JSON.stringify(uploadData).slice(0, 200));
            uploadUrl = uploadData?.data?.downloadUrl || uploadData?.data?.fileUrl || uploadData?.data?.url || '';
            if (!uploadUrl) return NextResponse.json({ error: `File upload failed: ${JSON.stringify(uploadData)}` }, { status: 500 });
        }

        if (!uploadUrl) return NextResponse.json({ error: 'Audio file or audioUrl required' }, { status: 400 });

        // Step 2: Generate 2 cover versions in parallel
        const makeRequest = async (variation: string) => {
            const body: Record<string, unknown> = {
                model: 'V4',
                uploadUrl,
                customMode: false,
                instrumental: false,
                callBackUrl: 'https://hmong-creative.vercel.app/api/cover-callback',
            };
            const promptParts = [style, variation].filter(Boolean);
            if (promptParts.length > 0) body.prompt = promptParts.join(', ');

            const res = await fetch('https://api.kie.ai/api/v1/generate', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            let data;
            try {
                data = await res.json();
            } catch {
                console.error('Cover generate response not JSON');
                return undefined;
            }

            console.log(`Cover (${variation || 'v1'}):`, JSON.stringify(data).slice(0, 200));
            return data?.data?.taskId as string | undefined;
        };

        const [taskId1, taskId2] = await Promise.all([
            makeRequest(''),
            makeRequest('variation'),
        ]);

        if (!taskId1) return NextResponse.json({ error: 'Cover generation failed to start' }, { status: 500 });

        // Step 3: Poll both tasks in parallel
        const pollTask = async (taskId: string): Promise<string> => {
            for (let i = 0; i < 40; i++) {
                await new Promise(r => setTimeout(r, 5000));

                let poll;
                try {
                    const pollRes = await fetch(
                        `https://api.kie.ai/api/v1/generate/record-info?taskId=${taskId}`,
                        { headers: { 'Authorization': `Bearer ${apiKey}` } }
                    );
                    poll = await pollRes.json();
                } catch {
                    console.error(`Poll ${i + 1} JSON parse error`);
                    continue;
                }

                if (i < 2) console.log(`Poll [${taskId.slice(-6)}] #${i + 1}:`, JSON.stringify(poll).slice(0, 250));

                const d = poll?.data;
                const state = d?.status || d?.state;
                const list: { audioUrl?: string; audio_url?: string; url?: string }[] =
                    d?.response?.sunoData || d?.sunoData || [];
                const url = list?.[0]?.audioUrl || list?.[0]?.audio_url || list?.[0]?.url || d?.audioUrl;

                if (url) return url;
                if (state === 'FAILED' || state === 'ERROR' || state === 'fail' || state === 'error') return '';
            }
            return '';
        };

        const [cover1, cover2] = await Promise.all([
            pollTask(taskId1),
            taskId2 ? pollTask(taskId2) : Promise.resolve(''),
        ]);

        if (!cover1 && !cover2) {
            return NextResponse.json({ error: 'Timeout — try again' }, { status: 408 });
        }

        const covers = [cover1, cover2].filter(Boolean).map(url => ({ audioUrl: url }));
        return NextResponse.json({
            audioUrl: covers[0]?.audioUrl || '',
            clips: covers,
        });

    } catch (e: unknown) {
        console.error('Cover audio error:', e);
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
    }
}