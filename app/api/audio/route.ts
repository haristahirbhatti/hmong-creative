import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { prompt, lyrics, style, instrumental, userId, userEmail, title } = await req.json();

    const apiKey = process.env.KIE_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'KIE_API_KEY not set' }, { status: 500 });

    // Build kie.ai request
    // - customMode: true  → use title + style + lyrics (exact lyrics mode)
    // - customMode: false → just prompt, AI writes its own lyrics
    const kieBody: Record<string, unknown> = {
      model: 'V4',
      callBackUrl: 'https://hmong-creative.vercel.app/api/audio-callback',
    };

    if (instrumental) {
      // Instrumental — no lyrics, just style
      kieBody.customMode = false;
      kieBody.instrumental = true;
      kieBody.prompt = `${title || prompt}: ${style || 'cinematic instrumental'}`;
    } else if (lyrics && lyrics.trim().length > 0) {
      // Custom lyrics mode — AI sings EXACTLY these lyrics
      kieBody.customMode = true;
      kieBody.instrumental = false;
      kieBody.title = title || prompt;
      kieBody.style = style || 'pop';
      kieBody.prompt = lyrics.trim(); // lyrics go in prompt field for customMode
    } else {
      // Simple mode — AI generates its own lyrics based on prompt
      kieBody.customMode = false;
      kieBody.instrumental = false;
      kieBody.prompt = `${title || prompt}: ${style || 'pop'}`;
    }

    console.log('KIE body:', JSON.stringify({ ...kieBody, prompt: String(kieBody.prompt).slice(0, 80) + '...' }));

    const createRes = await fetch('https://api.kie.ai/api/v1/generate', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(kieBody),
    });
    const createData = await createRes.json();
    console.log('KIE create response:', JSON.stringify(createData));

    if (!createRes.ok || createData.code !== 200) {
      return NextResponse.json({ error: createData.msg || `KIE error: ${JSON.stringify(createData)}` }, { status: 500 });
    }

    const taskId = createData.data?.taskId;
    if (!taskId) return NextResponse.json({ error: 'No taskId returned' }, { status: 500 });

    // Poll /api/v1/generate/record-info (confirmed working endpoint)
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 5000));

      const poll = await (await fetch(
        `https://api.kie.ai/api/v1/generate/record-info?taskId=${taskId}`,
        { headers: { 'Authorization': `Bearer ${apiKey}` } }
      )).json();

      if (i < 2) console.log(`Full poll #${i + 1}:`, JSON.stringify(poll).slice(0, 300));

      const data = poll?.data;
      const state = data?.status || data?.state;
      const sunoList = data?.response?.sunoData || data?.sunoData || [];
      const audioUrl = sunoList?.[0]?.audioUrl
        || sunoList?.[0]?.audio_url
        || sunoList?.[0]?.url
        || data?.audioUrl;

      console.log(`Poll #${i + 1} state:${state} audio:${audioUrl ? 'FOUND' : 'none'}`);

      if (audioUrl) {
        // Save to Supabase
        if (userId) {
          try {
            const supabase = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );
            await supabase.from('videos').insert({
              user_id: userId,
              email: userEmail,
              type: 'audio',
              prompt: title || String(prompt).slice(0, 100),
              result_url: audioUrl,
            });
            const { data: profile } = await supabase.from('profiles').select('audio_generated').eq('id', userId).single();
            await supabase.from('profiles').update({ audio_generated: (profile?.audio_generated || 0) + 1 }).eq('id', userId);
          } catch (dbErr) { console.error('DB save error:', dbErr); }
        }
        return NextResponse.json({ audioUrl, clips: sunoList });
      }

      if (state === 'FAILED' || state === 'ERROR' || state === 'fail' || state === 'error') {
        return NextResponse.json({ error: 'Suno generation failed' }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Timeout — try again' }, { status: 408 });

  } catch (e: unknown) {
    console.error('Audio route error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}