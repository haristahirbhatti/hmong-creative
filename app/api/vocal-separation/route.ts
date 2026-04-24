import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
    try {
        const { audioUrl, userId } = await req.json();
        if (!audioUrl) return NextResponse.json({ error: 'audioUrl required' }, { status: 400 });

        const apiKey = process.env.KIE_API_KEY;
        if (!apiKey) return NextResponse.json({ error: 'KIE_API_KEY not set' }, { status: 500 });

        const createRes = await fetch('https://api.kie.ai/api/v1/vocal-removal/generate', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioUrl, model: 'V5', callBackUrl: `${req.nextUrl.origin}/api/vocal-callback` }),
        });
        const createData = await createRes.json();
        console.log('Vocal sep create:', JSON.stringify(createData).slice(0, 200));

        const taskId = createData.data?.taskId;
        if (!taskId) return NextResponse.json({ error: createData.msg || 'Failed to start' }, { status: 500 });

        for (let i = 0; i < 30; i++) {
            await new Promise(r => setTimeout(r, 5000));
            const poll = await (await fetch(
                `https://api.kie.ai/api/v1/vocal-removal/record-info?taskId=${taskId}`,
                { headers: { 'Authorization': `Bearer ${apiKey}` } }
            )).json();

            if (i < 2) console.log(`Vocal poll #${i + 1}:`, JSON.stringify(poll).slice(0, 300));

            const d = poll?.data; const r = d?.response || d;
            const state = d?.status || d?.state;
            const vocalUrl = r?.vocalUrl || r?.vocal_url || r?.vocals || d?.vocalUrl;
            const instrumentalUrl = r?.instrumentalUrl || r?.instrumental_url || r?.bgmUrl || d?.instrumentalUrl;

            if (vocalUrl && instrumentalUrl) {
                // Save to DB
                if (userId) {
                    try {
                        const supabase = createClient(
                            process.env.NEXT_PUBLIC_SUPABASE_URL!,
                            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                        );
                        const { error: dbErr } = await supabase.from('videos').insert({
                            user_id: userId,
                            prompt: 'vocal separation',
                            video_url: vocalUrl,
                            type: 'audio',
                        });
                        if (dbErr) console.error('Vocal sep DB insert error:', dbErr.message);
                        else console.log('✅ Vocal separation saved to DB for user:', userId);
                    } catch (e) { console.error('Vocal sep DB error:', e); }
                }
                return NextResponse.json({ vocalUrl, instrumentalUrl, taskId });
            }
            if (state === 'FAILED' || state === 'fail' || state === 'error') return NextResponse.json({ error: 'Vocal separation failed' }, { status: 500 });
        }
        return NextResponse.json({ error: 'Timeout — try again' }, { status: 408 });
    } catch (e: unknown) {
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
    }
}