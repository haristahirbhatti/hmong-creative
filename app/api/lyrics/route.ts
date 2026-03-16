import { NextRequest, NextResponse } from 'next/server';

// Increase Vercel function timeout — polling can take 30-60s, default 10s kills it.
export const maxDuration = 60;

/** Detect if the user is requesting Hmong-language lyrics. */
function isHmongRequest(prompt: string): boolean {
    const lower = prompt.toLowerCase();
    return lower.includes('hmong') || lower.includes('hmoob');
}

/**
 * Walk an unknown object and return the first string value found for any of
 * the given keys (searched recursively, up to 4 levels deep).
 */
function deepFind(obj: unknown, keys: string[], depth = 0): string | null {
    if (depth > 4 || obj === null || typeof obj !== 'object') return null;
    const o = obj as Record<string, unknown>;
    for (const k of keys) {
        if (typeof o[k] === 'string' && (o[k] as string).length > 20) return o[k] as string;
    }
    for (const v of Object.values(o)) {
        if (Array.isArray(v)) {
            for (const item of v) {
                const found = deepFind(item, keys, depth + 1);
                if (found) return found;
            }
        } else {
            const found = deepFind(v, keys, depth + 1);
            if (found) return found;
        }
    }
    return null;
}

const LYRIC_KEYS = ['lyric', 'lyrics', 'text', 'content', 'body', 'lyricsText', 'lyricText'];
const TITLE_KEYS = ['title', 'name', 'songTitle', 'song_title'];

export async function POST(req: NextRequest) {
    try {
        const { prompt, variation } = await req.json();
        if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 });

        const apiKey = process.env.KIE_API_KEY;
        if (!apiKey) return NextResponse.json({ error: 'KIE_API_KEY not set' }, { status: 500 });

        const seed = Math.floor(Math.random() * 999999);
        const isV2 = variation === 'Option 2';
        const wantsHmong = isHmongRequest(prompt);

        // Language instruction — only for Hmong requests
        const langInstruction = wantsHmong
            ? ' Write ALL lyrics in the Hmong language (White Hmong / Hmoob Dawb). Every line must be in Hmong, NOT English.'
            : '';

        // Full prompt for Suno (no length limit)
        const fullPrompt = isV2
            ? `Write a completely different song (seed:${seed}): ${prompt}.${langInstruction} Different verses, structure, emotional tone.`
            : `Write a song (seed:${seed}): ${prompt}.${langInstruction}`;

        // Shorter prompt for kie.ai lyrics API — hard cap at 190 chars (their limit is 200)
        const shortBase = `${isV2 ? 'Different song: ' : 'Song: '}${prompt}${langInstruction}`.slice(0, 185);
        const kiePrompt = shortBase; // already ≤190 chars

        console.log(`[lyrics] variation=${variation || 'v1'} hmong=${wantsHmong} promptLen=${kiePrompt.length}`);
        console.log(`[lyrics] kiePrompt: ${kiePrompt}`);

        // ── 1. Try kie.ai /lyrics endpoint ────────────────────────────────────
        try {
            const createRes = await fetch('https://api.kie.ai/api/v1/lyrics', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: kiePrompt,
                    callBackUrl: 'https://hmong-creative.vercel.app/api/lyrics-callback',
                }),
                signal: AbortSignal.timeout(10000),
            });
            const createData = await createRes.json();
            console.log(`[lyrics] kie create → code=${createData.code} msg=${createData.msg} taskId=${createData.data?.taskId}`);

            const taskId = createData.data?.taskId;
            if (taskId) {
                for (let i = 0; i < 15; i++) {
                    await new Promise(r => setTimeout(r, 4000));
                    const pollRes = await fetch(
                        `https://api.kie.ai/api/v1/lyrics/record-info?taskId=${taskId}`,
                        { headers: { 'Authorization': `Bearer ${apiKey}` } }
                    );
                    const poll = await pollRes.json();

                    // Log the first two polls so we can see the exact response shape
                    if (i < 2) console.log(`[lyrics] kie poll[${i}]:`, JSON.stringify(poll).slice(0, 400));

                    const d = poll?.data;
                    const state = (d?.status || d?.state || '').toString().toUpperCase();

                    // Try to extract lyrics text from anywhere in the response
                    const text = deepFind(poll, LYRIC_KEYS);
                    const title = deepFind(poll, TITLE_KEYS) || '';

                    if (text) {
                        console.log(`[lyrics] kie success at poll ${i}`);
                        return NextResponse.json({ lyrics: text, title });
                    }
                    if (state === 'FAILED' || state === 'FAIL' || state === 'ERROR') {
                        console.log(`[lyrics] kie task FAILED at poll ${i}`);
                        break;
                    }
                }
            }
        } catch (e) {
            console.log('[lyrics] kie.ai lyrics exception:', e instanceof Error ? e.message.slice(0, 80) : e);
        }

        // ── 2. Fallback: Suno /generate endpoint ──────────────────────────────
        try {
            const sunoRes = await fetch('https://api.kie.ai/api/v1/generate', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'V4',
                    customMode: false,
                    instrumental: false,
                    prompt: fullPrompt,
                    callBackUrl: 'https://hmong-creative.vercel.app/api/lyrics-callback',
                }),
                signal: AbortSignal.timeout(10000),
            });
            const sunoData = await sunoRes.json();
            console.log(`[lyrics] suno create → code=${sunoData.code} msg=${sunoData.msg} taskId=${sunoData.data?.taskId}`);

            const sunoTaskId = sunoData.data?.taskId;
            if (sunoTaskId) {
                for (let i = 0; i < 15; i++) {
                    await new Promise(r => setTimeout(r, 5000));
                    const pollRes = await fetch(
                        `https://api.kie.ai/api/v1/generate/record-info?taskId=${sunoTaskId}`,
                        { headers: { 'Authorization': `Bearer ${apiKey}` } }
                    );
                    const poll = await pollRes.json();

                    // Log first two polls
                    if (i < 2) console.log(`[lyrics] suno poll[${i}]:`, JSON.stringify(poll).slice(0, 400));

                    const d = poll?.data;
                    const state = (d?.status || d?.state || '').toString().toUpperCase();

                    const text = deepFind(poll, LYRIC_KEYS);
                    const title = deepFind(poll, TITLE_KEYS) || '';

                    if (text) {
                        console.log(`[lyrics] suno success at poll ${i}`);
                        return NextResponse.json({ lyrics: text, title });
                    }
                    if (state === 'FAILED' || state === 'FAIL' || state === 'ERROR') {
                        console.log(`[lyrics] suno task FAILED at poll ${i}`);
                        break;
                    }
                }
            }
        } catch (e) {
            console.log('[lyrics] suno exception:', e instanceof Error ? e.message.slice(0, 80) : e);
        }

        // ── 3. Template fallback ──────────────────────────────────────────────
        console.log('[lyrics] All APIs failed — using template fallback. Hmong:', wantsHmong);

        const theme = prompt.trim();

        if (wantsHmong) {
            const hmongTemplate1 = `[Nqe 1]
Hnub no kuv lub siab nco txog koj
Txhua hmo kuv pw tsis tsaug zog
Koj lub npe nyob hauv kuv lub siab
Ib txhis kuv yuav tsis hnov qab koj

[Pre-Chorus]
Vim koj yog kuv txoj kev hlub
Tsis muaj leej twg los hloov tau koj

[Chorus]
Kuv hlub koj, hlub koj xwb
Txoj kev hlub no yuav nyob ib txhis
Ib txhis ua ke peb yuav mus
Txoj kev hlub no tsis muaj hnub kawg

[Nqe 2]
Thaum nag los ntws saum toj roob
Kuv txhawb kuv lub siab ntshaw koj
Txhua lub hnub nyoog dhau los
Kuv tos koj rov los cuag kuv

[Ntsiab Lus]
Sis, los ua ke nrog kuv
Txoj kev hlub no loj dua tej yam
Lub siab no tos koj xwb
Ib txhis yuav hlub koj ib leeg xwb

[Kawg]
Kuv hlub koj ib txhis...
Ib txhis ua ke...`;

            const hmongTemplate2 = `[Pib]
Saib lub ntuj xiab sov
Pom hnub poob qab roob

[Nqe 1]
Lub caij ntuj no tuaj
Daus los dawb huab
Nco txog koj lub suab
Hauv kuv lub siab nroo

[Chorus]
Vim koj yog kuv lub neej
Yog kuv txoj kev vam
Tsis muaj koj kuv poob qab
Tsis paub mus qhov twg

[Nqe 2]
Txhua hmo kuv pw xav
Xav txog koj lub ntsej muag
Lub ntiaj teb no dav
Tab sis kuv nco koj xwb

[Ntsiab Lus]
Rov los cuag kuv
Kuv tos koj ntawm no
Txoj hlub peb muaj
Yuav nyob mus ib txhis

[Kawg]
Ib txhis ib txhis...
Nco koj xwb...`;

            return NextResponse.json({
                lyrics: isV2 ? hmongTemplate2 : hmongTemplate1,
                title: isV2 ? 'Option 2' : 'Option 1',
                source: 'template',
            });
        }

        // English fallback
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
        console.error('[lyrics] Unhandled error:', e);
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
    }
}