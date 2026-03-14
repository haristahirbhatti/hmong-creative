import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { prompt, aspect_ratio, style, userId, userEmail } = await req.json();
    if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 });

    const apiKey = process.env.KIE_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'KIE_API_KEY not set' }, { status: 500 });

    const kiePrompt = style ? `${prompt}, ${style} style` : prompt;

    // Try multiple kie.ai image endpoints in order
    const ENDPOINTS = [
      {
        url: 'https://api.kie.ai/api/v1/ideogram/generate',
        body: { prompt: kiePrompt, aspectRatio: aspect_ratio || '1:1', model: 'V_2', styleType: 'REALISTIC' },
        poll: (taskId: string) => `https://api.kie.ai/api/v1/ideogram/record-info?taskId=${taskId}`,
        getUrl: (data: Record<string, unknown>) => {
          const r = data?.response as Record<string, unknown>;
          const arr = (r?.data as Array<Record<string, unknown>>) || [];
          return arr?.[0]?.url as string;
        },
      },
      {
        url: 'https://api.kie.ai/api/v1/luma/generate',
        body: { prompt: kiePrompt, aspectRatio: aspect_ratio || '1:1', loop: false },
        poll: (taskId: string) => `https://api.kie.ai/api/v1/luma/record-info?taskId=${taskId}`,
        getUrl: (data: Record<string, unknown>) => {
          const r = data?.response as Record<string, unknown>;
          return (r?.imageUrl || r?.image_url || r?.url) as string;
        },
      },
      {
        url: 'https://api.kie.ai/api/v1/flux/generate',
        body: { prompt: kiePrompt, aspectRatio: aspect_ratio || '1:1', outputFormat: 'jpeg', model: 'flux-dev' },
        poll: (taskId: string) => `https://api.kie.ai/api/v1/flux/record-info?taskId=${taskId}`,
        getUrl: (data: Record<string, unknown>) => {
          const r = data?.response as Record<string, unknown>;
          return (r?.imageUrl || r?.image_url) as string;
        },
      },
    ];

    let taskId = '';
    let activePollUrl = '';
    let activeGetUrl: (data: Record<string, unknown>) => string = () => '';

    for (const ep of ENDPOINTS) {
      try {
        console.log('Trying endpoint:', ep.url);
        const res = await fetch(ep.url, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(ep.body),
          signal: AbortSignal.timeout(8000),
        });
        const data = await res.json();
        console.log(`${ep.url} -> ${res.status}:`, JSON.stringify(data).slice(0, 150));

        if (data.code === 200 && data.data?.taskId) {
          taskId = data.data.taskId;
          activePollUrl = ep.poll(taskId);
          activeGetUrl = ep.getUrl;
          console.log('SUCCESS with endpoint:', ep.url, 'taskId:', taskId);
          break;
        }
      } catch (e) {
        console.log(`${ep.url} failed:`, e instanceof Error ? e.message : e);
        continue;
      }
    }

    if (!taskId) {
      return NextResponse.json({ error: 'All image generation endpoints failed — try again or use Vercel deployment' }, { status: 500 });
    }

    // Poll for result
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 3000));

      try {
        const poll = await (await fetch(activePollUrl, {
          headers: { 'Authorization': `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(8000),
        })).json();

        if (i < 2) console.log(`Full poll #${i + 1}:`, JSON.stringify(poll).slice(0, 250));

        const data = poll?.data;
        const state = data?.status || data?.state;
        const imageUrl = activeGetUrl(data)
          || data?.response?.imageUrl
          || data?.imageUrl
          || data?.response?.image_url;

        console.log(`Poll #${i + 1} state:${state} image:${imageUrl ? 'FOUND' : 'none'}`);

        if (imageUrl) {
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
        }

        if (state === 'FAILED' || state === 'ERROR' || state === 'fail' || state === 'error') {
          return NextResponse.json({ error: `Generation failed: ${JSON.stringify(data)}` }, { status: 500 });
        }
      } catch (pollErr) {
        console.error(`Poll #${i + 1} error:`, pollErr instanceof Error ? pollErr.message : pollErr);
      }
    }

    return NextResponse.json({ error: 'Timeout — try again' }, { status: 408 });

  } catch (e: unknown) {
    console.error('Create image error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}