import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { prompt, aspect_ratio, style, userId, userEmail } = await req.json();
    if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 });

    const apiKey = process.env.KIE_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'KIE API key not configured' }, { status: 500 });

    const createRes = await fetch('https://api.kie.ai/api/v1/flux/kontext/generate', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: `${prompt}${style ? `, ${style} style` : ''}`, enableTranslation: true, aspectRatio: aspect_ratio || '1:1', outputFormat: 'jpeg', promptUpsampling: false, model: 'flux-kontext-pro', safetyTolerance: 2 }),
    });
    const createData = await createRes.json();
    if (!createRes.ok || createData.code !== 200) return NextResponse.json({ error: createData.msg || 'Image generation failed' }, { status: 500 });

    const taskId = createData.data?.taskId;
    if (!taskId) return NextResponse.json({ error: 'No task ID' }, { status: 500 });

    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 3000));
      const poll     = await (await fetch(`https://api.kie.ai/api/v1/flux/record-info?taskId=${taskId}`, { headers: { 'Authorization': `Bearer ${apiKey}` } })).json();
      const status   = poll.data?.status;
      const imageUrl = poll.data?.response?.imageUrl || poll.data?.imageUrl;

      if (status === 'SUCCESS' && imageUrl) {
        // Save to Supabase
        if (userId) {
          try {
            const supabase = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );
            await supabase.from('videos').insert({ user_id: userId, email: userEmail, type: 'image', prompt, result_url: imageUrl });
            const { data: profile } = await supabase.from('profiles').select('images_generated').eq('id', userId).single();
            await supabase.from('profiles').update({ images_generated: (profile?.images_generated || 0) + 1 }).eq('id', userId);
          } catch (dbErr) { console.error('DB save error:', dbErr); }
        }
        return NextResponse.json({ imageUrl });
      }
      if (status === 'FAILED' || status === 'ERROR') return NextResponse.json({ error: 'Image generation failed' }, { status: 500 });
    }

    return NextResponse.json({ error: 'Timeout — try again' }, { status: 408 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}
