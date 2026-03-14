import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { prompt } = await req.json();
        if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 });

        const apiKey = process.env.KIE_API_KEY;
        if (!apiKey) return NextResponse.json({ error: 'KIE_API_KEY not set' }, { status: 500 });

        // Create lyrics generation task
        const createRes = await fetch('https://api.kie.ai/api/v1/lyrics', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt,
                callBackUrl: 'https://hmong-creative.vercel.app/api/lyrics-callback',
            }),
        });
        const createData = await createRes.json();
        console.log('Lyrics create:', JSON.stringify(createData).slice(0, 200));

        const taskId = createData.data?.taskId;
        if (!taskId) return NextResponse.json({ error: createData.msg || 'Failed to start lyrics task' }, { status: 500 });

        // Poll for result
        for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 3000));

            const poll = await (await fetch(
                `https://api.kie.ai/api/v1/lyrics/record-info?taskId=${taskId}`,
                { headers: { 'Authorization': `Bearer ${apiKey}` } }
            )).json();

            if (i < 2) console.log(`Lyrics poll #${i + 1}:`, JSON.stringify(poll).slice(0, 300));

            const data = poll?.data;
            const state = data?.status || data?.state;

            // Try multiple possible response shapes
            const variations: { title?: string; text?: string; lyric?: string }[] =
                data?.lyricsList || data?.variations || data?.response || data?.sunoData || [];

            const first = Array.isArray(variations) ? variations[0] : null;
            const lyricsText = first?.text || first?.lyric || data?.text || data?.lyrics || data?.lyric;

            if (lyricsText) {
                return NextResponse.json({ lyrics: lyricsText, title: first?.title || '' });
            }

            if (state === 'FAILED' || state === 'fail' || state === 'error') {
                return NextResponse.json({ error: 'Lyrics generation failed' }, { status: 500 });
            }
        }

        return NextResponse.json({ error: 'Timeout — try again' }, { status: 408 });
    } catch (e: unknown) {
        console.error('Lyrics error:', e);
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
    }
}
