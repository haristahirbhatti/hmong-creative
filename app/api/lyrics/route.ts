import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { prompt, variation } = await req.json();
        if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 });

        const apiKey = process.env.KIE_API_KEY;
        if (!apiKey) return NextResponse.json({ error: 'KIE_API_KEY not set' }, { status: 500 });

        // Add seed/timestamp to force different results each time
        const seed = Math.floor(Math.random() * 999999);
        const isV2 = variation === 'Option 2';

        // Build different prompts for each variation
        const kiePrompt = isV2
            ? `Write a completely different song (seed:${seed}): ${prompt}. Use different verses, different structure, different emotional tone than any previous version.`
            : `Write a song (seed:${seed}): ${prompt}`;

        console.log('Lyrics prompt:', kiePrompt.slice(0, 100), '| variation:', variation || 'v1');

        // Try kie.ai lyrics endpoint
        try {
            const createRes = await fetch('https://api.kie.ai/api/v1/lyrics', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: kiePrompt,
                    callBackUrl: 'https://hmong-creative.vercel.app/api/lyrics-callback',
                }),
                signal: AbortSignal.timeout(8000),
            });
            const createData = await createRes.json();
            console.log('Lyrics create:', createData.code, createData.msg);

            const taskId = createData.data?.taskId;
            if (taskId) {
                for (let i = 0; i < 20; i++) {
                    await new Promise(r => setTimeout(r, 3000));
                    const poll = await (await fetch(
                        `https://api.kie.ai/api/v1/lyrics/record-info?taskId=${taskId}`,
                        { headers: { 'Authorization': `Bearer ${apiKey}` } }
                    )).json();

                    const d = poll?.data;
                    const state = d?.status || d?.state;
                    const list = d?.lyricsList || d?.variations || d?.response || d?.sunoData || [];
                    const first = Array.isArray(list) ? list[isV2 ? (list.length > 1 ? 1 : 0) : 0] : null;
                    const text = first?.text || first?.lyric || first?.lyrics || d?.text || d?.lyrics;

                    if (text) return NextResponse.json({ lyrics: text, title: first?.title || '' });
                    if (state === 'FAILED' || state === 'fail' || state === 'error') break;
                }
            }
        } catch (e) {
            console.log('kie.ai lyrics failed:', e instanceof Error ? e.message.slice(0, 50) : e);
        }

        // Fallback: use Suno generate endpoint — gives different results each time
        const sunoRes = await fetch('https://api.kie.ai/api/v1/generate', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'V4',
                customMode: false,
                instrumental: false,
                prompt: kiePrompt,
                callBackUrl: 'https://hmong-creative.vercel.app/api/lyrics-callback',
            }),
        });
        const sunoData = await sunoRes.json();
        console.log('Suno fallback:', sunoData.code, sunoData.msg);

        const sunoTaskId = sunoData.data?.taskId;
        if (sunoTaskId) {
            for (let i = 0; i < 20; i++) {
                await new Promise(r => setTimeout(r, 5000));
                const poll = await (await fetch(
                    `https://api.kie.ai/api/v1/generate/record-info?taskId=${sunoTaskId}`,
                    { headers: { 'Authorization': `Bearer ${apiKey}` } }
                )).json();

                const d = poll?.data;
                const list = d?.response?.sunoData || d?.sunoData || [];
                // Pick index 0 for option 1, index 1 for option 2 (if available)
                const idx = isV2 && list.length > 1 ? 1 : 0;
                const text = list?.[idx]?.lyric || list?.[idx]?.lyrics || list?.[0]?.lyric;

                if (text) return NextResponse.json({ lyrics: text, title: list?.[idx]?.title || '' });
                if (d?.status === 'FAILED' || d?.state === 'fail') break;
            }
        }

        // Template fallback — English, based on user's actual prompt
        console.log('All APIs failed — using template fallback');
        const theme = prompt
            .replace(/— write a completely different.*$/i, '')
            .replace(/\(seed:\d+\)/g, '')
            .replace(/Write a( completely different)? song.*?:/i, '')
            .trim();

        const template1 = `[Verse 1]
${theme}
Every day and every night
I can feel it in my heart
Something pulling me to you

[Pre-Chorus]
I don't know what to say
But I feel it anyway

[Chorus]
${theme}
You're the reason that I stay
In my heart you'll always be
Forever and a day

[Verse 2]
When the morning comes around
And the silence fills the air
I still think about you then
Wishing you were still right there

[Bridge]
You are everything to me
Without you I'm not complete
I will hold on to this love
Until the end

[Outro]
${theme}
Always and forever...`;

        const template2 = `[Intro]
Sometimes I wonder why
The days go passing by

[Verse 1]
I look up at the sky
And think of you and I
${theme}
It makes me want to cry

[Chorus]
Because of ${theme}
My heart is full of love
I'll carry you with me
Like stars above

[Verse 2]
Every night I close my eyes
I see your face in every dream
${theme}
Nothing's ever what it seems

[Bridge]
Come back to me
I'm waiting here
This love we have
Will never disappear

[Outro]
${theme}
Now and always...`;

        return NextResponse.json({
            lyrics: isV2 ? template2 : template1,
            title: isV2 ? 'Option 2' : 'Option 1',
            source: 'template',
        });

    } catch (e: unknown) {
        console.error('Lyrics error:', e);
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
    }
}