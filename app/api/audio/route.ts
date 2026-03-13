import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { prompt, style, instrumental, userId, userEmail } = await req.json();
    if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 });

    const apiKey = process.env.KIE_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'KIE API key not configured' }, { status: 500 });

    const createRes = await fetch('https://api.kie.ai/api/v1/generate', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, customMode: true, instrumental: instrumental ?? true, model: 'V4', style: style || 'cinematic', title: 'Hmong Creative Track' }),
    });
    const createData = await createRes.json();
    if (!createRes.ok || createData.code !== 200) return NextResponse.json({ error: createData.msg || 'Audio generation failed' }, { status: 500 });

    const taskId = createData.data?.taskId;
    if (!taskId) return NextResponse.json({ error: 'No task ID' }, { status: 500 });

    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const poll     = await (await fetch(`https://api.kie.ai/api/v1/suno/record-info?taskId=${taskId}`, { headers: { 'Authorization': `Bearer ${apiKey}` } })).json();
      const status   = poll.data?.status;
      const audioUrl = poll.data?.response?.sunoData?.[0]?.audioUrl || poll.data?.response?.sunoData?.[0]?.audio_url;

      if (status === 'SUCCESS' && audioUrl) {
        // Save to Supabase
        if (userId) {
          try {
            const supabase = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );
            await supabase.from('videos').insert({ user_id: userId, email: userEmail, type: 'audio', prompt, result_url: audioUrl });
            const { data: profile } = await supabase.from('profiles').select('audio_generated').eq('id', userId).single();
            await supabase.from('profiles').update({ audio_generated: (profile?.audio_generated || 0) + 1 }).eq('id', userId);
          } catch (dbErr) { console.error('DB save error:', dbErr); }
        }
        return NextResponse.json({ audioUrl, clips: poll.data?.response?.sunoData });
      }
      if (status === 'FAILED' || status === 'ERROR') return NextResponse.json({ error: 'Audio generation failed' }, { status: 500 });
    }

    return NextResponse.json({ error: 'Timeout — try again' }, { status: 408 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}
