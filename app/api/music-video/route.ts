import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { taskId, audioId } = await req.json();
        if (!taskId) return NextResponse.json({ error: 'taskId required' }, { status: 400 });

        const apiKey = process.env.KIE_API_KEY;
        if (!apiKey) return NextResponse.json({ error: 'KIE_API_KEY not set' }, { status: 500 });

        const body: Record<string, unknown> = {
            taskId,
            callBackUrl: 'https://hmong-creative.vercel.app/api/music-video-callback',
        };
        if (audioId) body.audioId = audioId;

        const createRes = await fetch('https://api.kie.ai/api/v1/music-video/generate', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const createData = await createRes.json();
        console.log('Music video create:', JSON.stringify(createData).slice(0, 200));

        const mvTaskId = createData.data?.taskId;
        if (!mvTaskId) return NextResponse.json({ error: createData.msg || 'Failed to start music video task' }, { status: 500 });

        // Poll — music videos take longer, up to 50 polls × 6s = 5 min
        for (let i = 0; i < 50; i++) {
            await new Promise(r => setTimeout(r, 6000));

            const poll = await (await fetch(
                `https://api.kie.ai/api/v1/music-video/record-info?taskId=${mvTaskId}`,
                { headers: { 'Authorization': `Bearer ${apiKey}` } }
            )).json();

            if (i < 2) console.log(`Music video poll #${i + 1}:`, JSON.stringify(poll).slice(0, 300));

            const data = poll?.data;
            const state = data?.status || data?.state;
            const response = data?.response || data;

            const videoUrl =
                response?.videoUrl || response?.video_url || response?.url ||
                data?.videoUrl || data?.video_url;

            if (videoUrl) {
                return NextResponse.json({ videoUrl });
            }

            if (state === 'FAILED' || state === 'fail' || state === 'error') {
                return NextResponse.json({ error: 'Music video generation failed' }, { status: 500 });
            }
        }

        return NextResponse.json({ error: 'Timeout — try again' }, { status: 408 });
    } catch (e: unknown) {
        console.error('Music video error:', e);
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
    }
}
