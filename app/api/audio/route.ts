import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { prompt, lyrics, style, instrumental, userId, userEmail, title } = await req.json();

    // ✅ Use SUNO_V5_API_KEY for V5 model
    const apiKey = process.env.SUNO_V5_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'SUNO_V5_API_KEY not set' }, { status: 500 });

    const kieBody: Record<string, unknown> = {
      model: 'V5',
      callBackUrl: `${req.nextUrl.origin}/api/audio-callback`,
    };

    if (instrumental) {
      kieBody.customMode = false;
      kieBody.instrumental = true;
      kieBody.prompt = `${title || prompt}: ${style || 'cinematic instrumental'}`;
    } else if (lyrics && lyrics.trim().length > 0) {
      kieBody.customMode = true;
      kieBody.instrumental = false;
      kieBody.title = title || prompt;
      kieBody.style = style || 'pop';
      kieBody.prompt = lyrics.trim();
    } else {
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

    // Poll for result
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 5000));

      const poll = await (await fetch(
        `https://api.kie.ai/api/v1/generate/record-info?taskId=${taskId}`,
        { headers: { 'Authorization': `Bearer ${apiKey}` } }
      )).json();

      if (i < 2) console.log(`Full poll #${i + 1}:`, JSON.stringify(poll).slice(0, 300));

      const data = poll?.data;
      const state = data?.status || data?.state;
      const sunoList: { audioUrl?: string; audio_url?: string; url?: string }[] =
        data?.response?.sunoData || data?.sunoData || [];

      const getUrl = (item: { audioUrl?: string; audio_url?: string; url?: string }) =>
        item?.audioUrl || item?.audio_url || item?.url || '';

      const validClips = sunoList.filter(s => getUrl(s));
      const firstUrl = validClips[0] ? getUrl(validClips[0]) : (data?.audioUrl || '');

      console.log(`Poll #${i + 1} state:${state} clips_ready:${validClips.length}`);

      const bothReady = validClips.length >= 2;
      const partialOk = validClips.length >= 1 && i >= 28;

      if ((bothReady || partialOk) && firstUrl) {
        // Save to Supabase
        if (userId) {
          try {
            const supabase = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );
            try { await supabase.from('profiles').upsert({ id: userId }, { onConflict: 'id', ignoreDuplicates: true }); } catch (e) {}
            const { error: insertErr } = await supabase.from('videos').insert({
              user_id: userId,
              prompt: title || String(prompt).slice(0, 100),
              video_url: firstUrl,
              type: 'audio',
            });
            if (!insertErr) {
              const { data: prof } = await supabase.from('profiles').select('audio_generated').eq('id', userId).single();
              await supabase.from('profiles').update({ audio_generated: (prof?.audio_generated || 0) + 1 }).eq('id', userId);
              console.log('✅ Audio saved & incremented for user:', userId);
            } else { console.error('Audio DB insert error:', insertErr.message); }
          } catch (dbErr) { console.error('DB save error:', dbErr); }
        }

        const enrichedClips = validClips.map(c => ({
          ...c,
          audioId: (c as Record<string, unknown>).id as string ||
            (c as Record<string, unknown>).audioId as string || '',
        }));

        return NextResponse.json({ audioUrl: firstUrl, clips: enrichedClips, taskId });
      }

      if (state === 'FAILED' || state === 'ERROR' || state === 'fail' || state === 'error' ||
        state === 'GENERATE_AUDIO_FAILED' || state === 'CREATE_TASK_FAILED') {
        return NextResponse.json({ error: 'Suno generation failed' }, { status: 500 });
      }

      if (state === 'SENSITIVE_WORD_ERROR') {
        return NextResponse.json({ error: 'Content filtered by Suno. Please modify your lyrics or prompt and try again.' }, { status: 422 });
      }
    }

    return NextResponse.json({ error: 'Timeout — try again' }, { status: 408 });

  } catch (e: unknown) {
    console.error('Audio route error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}
