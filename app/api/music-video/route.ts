import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
    try {
        const { taskId, audioId, userId } = await req.json();
        if (!taskId) return NextResponse.json({ error: 'taskId required' }, { status: 400 });

        const apiKey = process.env.KIE_API_KEY;
        if (!apiKey) return NextResponse.json({ error: 'KIE_API_KEY not set' }, { status: 500 });

        const body: Record<string, unknown> = { taskId, callBackUrl: `${req.nextUrl.origin}/api/music-video-callback` };
        if (audioId) body.audioId = audioId;

        const createRes = await fetch('https://api.kie.ai/api/v1/music-video/generate', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const createData = await createRes.json();
        console.log('Music video create:', JSON.stringify(createData).slice(0, 200));

        const mvTaskId = createData.data?.taskId;
        if (!mvTaskId) return NextResponse.json({ error: createData.msg || 'Failed to start' }, { status: 500 });

        for (let i = 0; i < 50; i++) {
            await new Promise(r => setTimeout(r, 6000));
            const poll = await (await fetch(
                `https://api.kie.ai/api/v1/music-video/record-info?taskId=${mvTaskId}`,
                { headers: { 'Authorization': `Bearer ${apiKey}` } }
            )).json();

            if (i < 2) console.log(`MV poll #${i + 1}:`, JSON.stringify(poll).slice(0, 300));

            const d = poll?.data; const r = d?.response || d;
            const state = d?.status || d?.state;
            const videoUrl = r?.videoUrl || r?.video_url || r?.url || d?.videoUrl;

            if (videoUrl) {
                // Save to DB
                if (userId) {
                    try {
                        const supabase = createClient(
                            process.env.NEXT_PUBLIC_SUPABASE_URL!,
                            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                        );
                        try { await supabase.from('profiles').upsert({ id: userId }, { onConflict: 'id', ignoreDuplicates: true }); } catch (e) {}
                        const { error: dbErr } = await supabase.from('videos').insert({
                            user_id: userId,
                            prompt: 'music video',
                            video_url: videoUrl,
                            type: 'video',
                        });
                        if (!dbErr) {
                            const { data: prof } = await supabase.from('profiles').select('videos_generated').eq('id', userId).single();
                            await supabase.from('profiles').update({ videos_generated: (prof?.videos_generated || 0) + 1 }).eq('id', userId);
                            console.log('✅ Music video saved & incremented for user:', userId);
                        } else { console.error('Music video DB insert error:', dbErr.message); }
                    } catch (e) { console.error('Music video DB error:', e); }
                }
                return NextResponse.json({ videoUrl });
            }
            if (state === 'FAILED' || state === 'fail' || state === 'error') return NextResponse.json({ error: 'Music video generation failed' }, { status: 500 });
        }
        return NextResponse.json({ error: 'Timeout — try again' }, { status: 408 });
    } catch (e: unknown) {
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
    }
}