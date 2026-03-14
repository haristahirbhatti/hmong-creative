import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { prompt, aspect_ratio, style, userId, userEmail } = await req.json();
    if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 });

    const apiKey = process.env.KIE_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'KIE_API_KEY not set' }, { status: 500 });

    const kiePrompt = style ? `${prompt}, ${style} style` : prompt;

    const DIMS: Record<string, { w: number; h: number }> = {
      '1:1': { w: 1024, h: 1024 },
      '16:9': { w: 1344, h: 768 },
      '9:16': { w: 768, h: 1344 },
      '4:3': { w: 1152, h: 896 },
      '3:4': { w: 896, h: 1152 },
    };
    const { w, h } = DIMS[aspect_ratio || '1:1'] || DIMS['1:1'];

    let imageUrl = '';

    // Try kie.ai endpoints
    const KIE_ENDPOINTS = [
      {
        url: 'https://api.kie.ai/api/v1/flux/kontext/generate',
        body: { prompt: kiePrompt, enableTranslation: true, aspectRatio: aspect_ratio || '1:1', outputFormat: 'jpeg', promptUpsampling: false, model: 'flux-kontext-pro', safetyTolerance: 2 },
        poll: (id: string) => `https://api.kie.ai/api/v1/flux/record-info?taskId=${id}`,
        getUrl: (d: Record<string, unknown>) => {
          const r = d?.response as Record<string, unknown>;
          return (r?.imageUrl || r?.image_url || d?.imageUrl) as string;
        },
      },
      {
        url: 'https://api.kie.ai/api/v1/flux/generate',
        body: { prompt: kiePrompt, aspectRatio: aspect_ratio || '1:1', outputFormat: 'jpeg', model: 'flux-dev' },
        poll: (id: string) => `https://api.kie.ai/api/v1/flux/record-info?taskId=${id}`,
        getUrl: (d: Record<string, unknown>) => {
          const r = d?.response as Record<string, unknown>;
          return (r?.imageUrl || r?.image_url || d?.imageUrl) as string;
        },
      },
      {
        url: 'https://api.kie.ai/api/v1/sd/generate',
        body: { prompt: kiePrompt, negativePrompt: 'blurry, low quality, ugly', width: w, height: h, steps: 25, cfgScale: 7 },
        poll: (id: string) => `https://api.kie.ai/api/v1/sd/record-info?taskId=${id}`,
        getUrl: (d: Record<string, unknown>) => {
          const r = d?.response as Record<string, unknown>;
          return (r?.imageUrl || r?.image_url || d?.imageUrl) as string;
        },
      },
    ];

    for (const ep of KIE_ENDPOINTS) {
      try {
        console.log('Trying:', ep.url);
        const res = await fetch(ep.url, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(ep.body),
          signal: AbortSignal.timeout(10000),
        });
        const data = await res.json();
        console.log(`Response code:${data.code} msg:${data.msg}`);

        if (data.code === 200 && data.data?.taskId) {
          const taskId = data.data.taskId;
          for (let i = 0; i < 30; i++) {
            await new Promise(r => setTimeout(r, 3000));
            const poll = await (await fetch(ep.poll(taskId), {
              headers: { 'Authorization': `Bearer ${apiKey}` },
              signal: AbortSignal.timeout(8000),
            })).json();
            const d = poll?.data || {};
            const state = d?.status || d?.state;
            const url = ep.getUrl(d);
            console.log(`Poll #${i + 1} state:${state} url:${url ? 'FOUND' : 'none'}`);
            if (url) { imageUrl = url; break; }
            if (state === 'FAILED' || state === 'ERROR' || state === 'fail' || state === 'error') break;
          }
          if (imageUrl) break;
        }
      } catch (e) {
        console.log(`${ep.url} failed:`, e instanceof Error ? e.message.slice(0, 60) : e);
      }
    }

    // Fallback: Pollinations — fetch image bytes and return as base64
    // This avoids CORS/display issues with direct Pollinations URLs
    if (!imageUrl) {
      console.log('Using Pollinations fallback...');
      const seed = Math.floor(Math.random() * 999999);
      const polUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(kiePrompt)}?width=${w}&height=${h}&seed=${seed}&model=flux&nologo=true&enhance=true`;

      try {
        const imgRes = await fetch(polUrl, { signal: AbortSignal.timeout(60000) });
        if (imgRes.ok) {
          const buffer = await imgRes.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          const mime = imgRes.headers.get('content-type') || 'image/jpeg';
          imageUrl = `data:${mime};base64,${base64}`;
          console.log('Pollinations image fetched, size:', buffer.byteLength);
        }
      } catch (e) {
        console.log('Pollinations fetch failed:', e instanceof Error ? e.message : e);
        // Last resort: return URL directly
        imageUrl = polUrl;
      }
    }

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image generation failed — please try again' }, { status: 500 });
    }

    // Save to Supabase (skip base64 URLs, too large)
    if (userId && !imageUrl.startsWith('data:')) {
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