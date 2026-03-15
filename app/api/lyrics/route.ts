import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { prompt } = await req.json();
        if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 });

        const apiKey = process.env.KIE_API_KEY;
        if (!apiKey) return NextResponse.json({ error: 'KIE_API_KEY not set' }, { status: 500 });

        // Step 1: Try kie.ai lyrics endpoint
        const createRes = await fetch('https://api.kie.ai/api/v1/lyrics', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt,
                callBackUrl: 'https://hmong-creative.vercel.app/api/lyrics-callback',
            }),
            signal: AbortSignal.timeout(8000),
        });
        const createData = await createRes.json();
        console.log('Lyrics create HTTP:', createRes.status, 'code:', createData.code, 'msg:', createData.msg);
        console.log('Full:', JSON.stringify(createData).slice(0, 300));

        const taskId = createData.data?.taskId;

        if (taskId) {
            // Poll
            for (let i = 0; i < 20; i++) {
                await new Promise(r => setTimeout(r, 3000));
                const poll = await (await fetch(
                    `https://api.kie.ai/api/v1/lyrics/record-info?taskId=${taskId}`,
                    { headers: { 'Authorization': `Bearer ${apiKey}` } }
                )).json();

                if (i < 3) console.log(`Lyrics poll #${i + 1}:`, JSON.stringify(poll).slice(0, 300));

                const d = poll?.data;
                const state = d?.status || d?.state;
                const list = d?.lyricsList || d?.variations || d?.response || d?.sunoData || [];
                const first = Array.isArray(list) ? list[0] : null;
                const text = first?.text || first?.lyric || first?.lyrics
                    || d?.text || d?.lyrics || d?.lyric;

                if (text) return NextResponse.json({ lyrics: text, title: first?.title || '' });
                if (state === 'FAILED' || state === 'fail' || state === 'error') break;
            }
        }

        // Fallback: Generate lyrics using Suno (same API as audio but ask for lyrics only)
        console.log('kie.ai lyrics failed — using Suno fallback...');
        const sunoRes = await fetch('https://api.kie.ai/api/v1/generate', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'V4',
                customMode: false,
                instrumental: false,
                prompt: `Write song lyrics for: ${prompt}`,
                callBackUrl: 'https://hmong-creative.vercel.app/api/lyrics-callback',
            }),
        });
        const sunoData = await sunoRes.json();
        console.log('Suno fallback:', JSON.stringify(sunoData).slice(0, 200));

        const sunoTaskId = sunoData.data?.taskId;
        if (sunoTaskId) {
            for (let i = 0; i < 20; i++) {
                await new Promise(r => setTimeout(r, 5000));
                const poll = await (await fetch(
                    `https://api.kie.ai/api/v1/generate/record-info?taskId=${sunoTaskId}`,
                    { headers: { 'Authorization': `Bearer ${apiKey}` } }
                )).json();
                if (i < 2) console.log(`Suno lyrics poll #${i + 1}:`, JSON.stringify(poll).slice(0, 300));

                const d = poll?.data;
                const list = d?.response?.sunoData || d?.sunoData || [];
                const text = list?.[0]?.lyric || list?.[0]?.lyrics || list?.[0]?.text;
                if (text) return NextResponse.json({ lyrics: text, title: '' });
                if (d?.status === 'FAILED' || d?.state === 'fail') break;
            }
        }

        // Last fallback: Claude-style template lyrics based on prompt
        console.log('All API lyrics failed — using template fallback');
        const templateLyrics = generateTemplateLyrics(prompt);
        return NextResponse.json({ lyrics: templateLyrics, title: '', source: 'template' });

    } catch (e: unknown) {
        console.error('Lyrics error:', e);
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
    }
}

function generateTemplateLyrics(prompt: string): string {
    const theme = prompt.replace(/—.*$/, '').trim();
    return `[Verse 1]
Hauv lub ntuj no
Kuv xav txog koj
${theme}
Nyob hauv kuv lub siab

[Pre-Chorus]
Tsis paub yuav ua li cas
Lub siab mob heev

[Chorus]
${theme}
Kuv lub siab quaj
Txoj kev hlub no
Yuav nyob ib txhis

[Verse 2]
Hnub twg koj rov los
Kuv yuav tos koj
Ntawm no xwb
Kuv lub siab cia

[Bridge]
Koj yog kuv txoj sia
Koj yog kuv lub ntuj
Tsis muaj koj
Kuv lub neej khoob

[Outro]
${theme}
Mus ib txhis...`;
}