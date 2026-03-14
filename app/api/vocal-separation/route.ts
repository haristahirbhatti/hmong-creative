import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { audioUrl } = await req.json();
        if (!audioUrl) return NextResponse.json({ error: 'audioUrl required' }, { status: 400 });

        const apiKey = process.env.KIE_API_KEY;
        if (!apiKey) return NextResponse.json({ error: 'KIE_API_KEY not set' }, { status: 500 });

        // Start vocal separation task
        const createRes = await fetch('https://api.kie.ai/api/v1/vocal-removal/generate', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                audioUrl,
                model: 'V5',
                callBackUrl: 'https://hmong-creative.vercel.app/api/vocal-callback',
            }),
        });
        const createData = await createRes.json();
        console.log('Vocal sep create:', JSON.stringify(createData).slice(0, 200));

        const taskId = createData.data?.taskId;
        if (!taskId) return NextResponse.json({ error: createData.msg || 'Failed to start vocal separation' }, { status: 500 });

        // Poll for result
        for (let i = 0; i < 30; i++) {
            await new Promise(r => setTimeout(r, 5000));

            const poll = await (await fetch(
                `https://api.kie.ai/api/v1/vocal-removal/record-info?taskId=${taskId}`,
                { headers: { 'Authorization': `Bearer ${apiKey}` } }
            )).json();

            if (i < 2) console.log(`Vocal poll #${i + 1}:`, JSON.stringify(poll).slice(0, 400));

            const data = poll?.data;
            const state = data?.status || data?.state;
            const response = data?.response || data;

            // Try multiple possible field names for vocal and instrumental URLs
            const vocalUrl =
                response?.vocalUrl || response?.vocal_url || response?.vocals ||
                data?.vocalUrl || data?.vocal_url;
            const instrumentalUrl =
                response?.instrumentalUrl || response?.instrumental_url || response?.instrumental ||
                response?.bgmUrl || data?.instrumentalUrl || data?.bgmUrl;

            if (vocalUrl && instrumentalUrl) {
                return NextResponse.json({ vocalUrl, instrumentalUrl, taskId });
            }

            if (state === 'FAILED' || state === 'fail' || state === 'error') {
                return NextResponse.json({ error: 'Vocal separation failed' }, { status: 500 });
            }
        }

        return NextResponse.json({ error: 'Timeout — try again' }, { status: 408 });
    } catch (e: unknown) {
        console.error('Vocal separation error:', e);
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
    }
}
