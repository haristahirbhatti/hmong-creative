import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { prompt, aspect_ratio, style, userId, userEmail } = await req.json();
    if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 });

    const apiKey = process.env.KIE_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'KIE_API_KEY not set' }, { status: 500 });

    const kiePrompt = style ? `${prompt}, ${style} style` : prompt;

    // Dimensions based on ratio
    const DIMS: Record<string, { w: number; h: number }> = {
      '1:1': { w: 1024, h: 1024 },
      '16:9': { w: 1344, h: 768 },
      '9:16': { w: 768, h: 1344 },
      '4:3': { w: 1152, h: 896 },
      '3:4': { w: 896, h: 1152 },
    };
    const { w, h } = DIMS[aspect_ratio || '1:1'] || DIMS['1:1'];

    // kie.ai endpoints to try in order
    const KIE_ATTEMPTS = [
      // Stable Diffusion
      {
        generate: {
          url: 'https://api.kie.ai/api/v1/sd/generate',
          body: { prompt: kiePrompt, negativePrompt: 'blurry, low quality', width: w, height: h, steps: 20, cfgScale: 7, model: 'sd-xl' },
        },
        poll: (id: string) => `https://api.kie.ai/api/v1/sd/record-info?taskId=${id}`,
        getUrl: (d: Record<string, unknown>) => (d?.response as Record<string, unknown>)?.imageUrl as string || (d?.response as Record<string, unknown>)?.image_url as string,
      },
      // MidJourney
      {
        generate: {
          url: 'https://api.kie.ai/api/v1/mj/imagine',
          body: { prompt: kiePrompt, aspectRatio: aspect_ratio || '1:1' },
        },
        poll: (id: string) => `https://api.kie.ai/api/v1/mj/record-info?taskId=${id}`,
        getUrl: (d: Record<string, unknown>) => (d?.response as Record<string, unknown>)?.imageUrl as string || d?.imageUrl as string,
      },
      // DALL-E style
      {
        generate: {
          url: 'https://api.kie.ai/api/v1/dalle/generate',
          body: { prompt: kiePrompt, size: `${w}x${h}`, quality: 'standard' },
        },
        poll: (id: string) => `https://api.kie.ai/api/v1/dalle/record-info?taskId=${id}`,
        getUrl: (d: Record<string, unknown>) => (d?.response as Record<string, unknown>)?.imageUrl as string || d?.imageUrl as string,
      },
      // Flux standard (non-kontext)
      {
        generate: {
          url: 'https://api.kie.ai/api/v1/flux/generate',
          body: { prompt: kiePrompt, aspectRatio: aspect_ratio || '1:1', outputFormat: 'jpeg', model: 'flux-dev' },
        },
        poll: (id: string) => `https://api.kie.ai/api/v1/flux/record-info?taskId=${id}`,
        getUrl: (d: Record<string, unknown>) => (d?.response as Record<string, unknown>)?.imageUrl as string || d?.imageUrl as string,
      },
    ];

    let imageUrl = '';
    let usedEndpoint = '';

    for (const attempt of KIE_ATTEMPTS) {
      try {
        console.log('Trying:', attempt.generate.url);
        const res = await fetch(attempt.generate.url, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(attempt.generate.body),
          signal: AbortSignal.timeout(10000),
        });
        const data = await res.json();
        console.log(`${attempt.generate.url} -> code:${data.code} msg:${data.msg}`);

        if (data.code === 200 && data.data?.taskId) {
          const taskId = data.data.taskId;
          usedEndpoint = attempt.generate.url;
          console.log('Got taskId:', taskId, 'from', usedEndpoint);

          // Poll
          for (let i = 0; i < 30; i++) {
            await new Promise(r => setTimeout(r, 3000));
            const poll = await (await fetch(
              attempt.poll(taskId),
              { headers: { 'Authorization': `Bearer ${apiKey}` }, signal: AbortSignal.timeout(8000) }
            )).json();

            const d = poll?.data || {};
            const state = d?.status || d?.state;
            const url = attempt.getUrl(d)
              || d?.response?.imageUrl
              || d?.imageUrl
              || d?.image_url;

            console.log(`Poll #${i + 1} [${usedEndpoint.split('/').pop()}] state:${state} url:${url ? 'FOUND' : 'none'}`);

            if (url) { imageUrl = url; break; }
            if (state === 'FAILED' || state === 'ERROR' || state === 'fail' || state === 'error') break;
          }
          if (imageUrl) break;
        }
      } catch (e) {
        console.log(`${attempt.generate.url} failed:`, e instanceof Error ? e.message.slice(0, 80) : e);
      }
    }

    // Final fallback — Pollinations (always works, free, no key)
    if (!imageUrl) {
      console.log('All kie.ai endpoints failed, using Pollinations fallback');
      const seed = Math.floor(Math.random() * 999999);
      imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(kiePrompt)}?width=${w}&height=${h}&seed=${seed}&model=flux&nologo=true&enhance=true`;
    }

    // Save to Supabase
    if (userId) {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        await supabase.from('videos').insert({ user_id: userId, email: userEmail, type: 'image', prompt: prompt.slice(0, 200), result_url: imageUrl });
        const { data: profile } = await supabase.from('profiles').select('images_generated').eq('id', userId).single();
        await supabase.from('profiles').update({ images_generated: (profile?.images_generated || 0) + 1 }).eq('id', userId);
      } catch (dbErr) { console.error('DB save error:', dbErr); }
    }

    return NextResponse.json({ imageUrl });

  } catch (e: unknown) {
    console.error('Create image error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}