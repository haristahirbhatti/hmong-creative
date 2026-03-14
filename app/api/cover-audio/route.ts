import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const audioFile = formData.get('audio') as File | null;
        const audioUrl = formData.get('audioUrl') as string || '';
        const style = formData.get('style') as string || 'pop';

        const apiKey = process.env.KIE_API_KEY;
        if (!apiKey) return NextResponse.json({ error: 'KIE_API_KEY not set' }, { status: 500 });

        let uploadUrl = audioUrl;

        // If a file was uploaded, convert to base64 and upload to KIE first
        if (audioFile && !uploadUrl) {
            const bytes = await audioFile.arrayBuffer();
            const base64 = Buffer.from(bytes).toString('base64');

            const uploadRes = await fetch('https://kieai.redpandaai.co/api/file-base64-upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    base64Data: `data:${audioFile.type || 'audio/mpeg'};base64,${base64}`,
                    uploadPath: 'audio',
                    fileName: `upload-${Date.now()}.mp3`,
                }),
            });
            const uploadData = await uploadRes.json();
            console.log('Cover audio upload response:', JSON.stringify(uploadData).slice(0, 200));
            uploadUrl = uploadData?.data?.downloadUrl || uploadData?.data?.fileUrl || uploadData?.data?.url || '';
            if (!uploadUrl) return NextResponse.json({ error: `File upload failed: ${JSON.stringify(uploadData)}` }, { status: 500 });
        }

        if (!uploadUrl) return NextResponse.json({ error: 'Audio file or audioUrl required' }, { status: 400 });

        // KIE Upload And Cover Audio endpoint — uses `uploadUrl` field (not audioUrl)
        // and requires Suno-style fields (customMode, instrumental, prompt/style)
        const createRes = await fetch('https://api.kie.ai/api/v1/generate', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'V4',
                uploadUrl,                    // the uploaded audio to cover
                customMode: false,
                instrumental: false,
                prompt: style || 'pop',       // style goes in prompt for non-customMode
                callBackUrl: 'https://hmong-creative.vercel.app/api/cover-callback',
            }),
        });
        const createData = await createRes.json();
        console.log('Cover create response:', JSON.stringify(createData).slice(0, 300));

        const taskId = createData.data?.taskId;
        if (!taskId) {
            return NextResponse.json({ error: createData.msg || `KIE error: ${JSON.stringify(createData)}` }, { status: 500 });
        }

        // Poll for result — same pattern as audio generation
        for (let i = 0; i < 40; i++) {
            await new Promise(r => setTimeout(r, 5000));

            const poll = await (await fetch(
                `https://api.kie.ai/api/v1/generate/record-info?taskId=${taskId}`,
                { headers: { 'Authorization': `Bearer ${apiKey}` } }
            )).json();

            if (i < 2) console.log(`Cover poll #${i + 1}:`, JSON.stringify(poll).slice(0, 300));

            const data = poll?.data;
            const state = data?.status || data?.state;
            const sunoList: { audioUrl?: string; audio_url?: string; url?: string }[] =
                data?.response?.sunoData || data?.sunoData || [];

            const coverUrl = sunoList?.[0]?.audioUrl || sunoList?.[0]?.audio_url || sunoList?.[0]?.url || data?.audioUrl;

            if (coverUrl) {
                return NextResponse.json({ audioUrl: coverUrl, clips: sunoList });
            }

            if (state === 'FAILED' || state === 'ERROR' || state === 'fail' || state === 'error') {
                return NextResponse.json({ error: 'Cover generation failed' }, { status: 500 });
            }
        }

        return NextResponse.json({ error: 'Timeout — try again' }, { status: 408 });
    } catch (e: unknown) {
        console.error('Cover audio error:', e);
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
    }
}
