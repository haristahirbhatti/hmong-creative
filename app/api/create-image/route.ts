import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { prompt, aspect_ratio, style, userId, userEmail, model } = await req.json();
    if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 });

    const kieKey = process.env.KIE_API_KEY;
    if (!kieKey) return NextResponse.json({ error: 'KIE_API_KEY not set' }, { status: 500 });

    const kiePrompt = style ? `${prompt}, ${style} style` : prompt;

    const origin = req.nextUrl.origin;
    // ── Model: Nano Banana ──
    if (model === 'nano-banana') {
      return await generateNanoBanana(kieKey, kiePrompt, aspect_ratio, userId, userEmail, prompt, origin);
    }

    // ── Model: FLUX Kontext (default) ──
    return await generateFlux(kieKey, kiePrompt, aspect_ratio, userId, userEmail, prompt, origin);

  } catch (e: unknown) {
    console.error('Create image error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}

// ── FLUX Kontext ──
async function generateFlux(kieKey: string, prompt: string, aspect_ratio: string, userId: string, userEmail: string, rawPrompt: string, origin: string) {
  const createRes = await fetch('https://api.kie.ai/api/v1/flux/kontext/generate', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${kieKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      aspectRatio: aspect_ratio || '1:1',
      outputFormat: 'jpeg',
      model: 'flux-kontext-pro',
      safetyTolerance: 2,
      enableTranslation: true,
      promptUpsampling: false,
      callBackUrl: `${origin}/api/image-callback`,
    }),
  });
  const createData = await createRes.json();
  console.log('FLUX create:', createData.code, createData.msg, 'taskId:', createData.data?.taskId);

  if (createData.code !== 200 || !createData.data?.taskId) {
    return NextResponse.json({ error: createData.msg || 'FLUX generation failed' }, { status: 500 });
  }

  const taskId = createData.data.taskId;

  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const poll = await (await fetch(
      `https://api.kie.ai/api/v1/flux/kontext/record-info?taskId=${taskId}`,
      { headers: { 'Authorization': `Bearer ${kieKey}` } }
    )).json();

    if (i < 2) console.log(`FLUX poll #${i + 1}:`, JSON.stringify(poll).slice(0, 400));

    const d = poll?.data || {};
    const successFlag = d?.successFlag;
    const response = d?.response;

    if (successFlag === 1) {
      let parsed = response;
      if (typeof response === 'string') {
        if (response.startsWith('http')) {
          await saveToDb(userId, userEmail, rawPrompt, response);
          return NextResponse.json({ imageUrl: response });
        }
        try { parsed = JSON.parse(response); } catch { parsed = response; }
      }
      const imageUrl = parsed?.resultImageUrl || parsed?.originImageUrl || parsed?.imageUrl
        || parsed?.image_url || parsed?.url
        || d?.resultImageUrl || d?.imageUrl || d?.url || '';
      if (imageUrl) {
        await saveToDb(userId, userEmail, rawPrompt, imageUrl);
        return NextResponse.json({ imageUrl });
      }
      return NextResponse.json({ error: 'Image generated but URL not found' }, { status: 500 });
    }
    if (d?.errorCode || successFlag === -1) {
      return NextResponse.json({ error: `FLUX failed: ${d?.errorCode || 'unknown'}` }, { status: 500 });
    }
  }
  return NextResponse.json({ error: 'Timeout — please try again' }, { status: 408 });
}

// ── Nano Banana ──
async function generateNanoBanana(kieKey: string, prompt: string, aspect_ratio: string, userId: string, userEmail: string, rawPrompt: string, origin: string) {
  console.log('Nano Banana generate:', prompt.slice(0, 80), 'ratio:', aspect_ratio);

  // Try known kie.ai nano banana endpoint patterns
  const NANO_ENDPOINTS = [
    {
      url: 'https://api.kie.ai/api/v1/nano-banana/generate',
      body: { prompt, aspectRatio: aspect_ratio || '1:1', callBackUrl: `${origin}/api/image-callback` },
      poll: 'https://api.kie.ai/api/v1/nano-banana/record-info',
    },
    {
      url: 'https://api.kie.ai/api/v1/nano-banana-2/generate',
      body: { prompt, aspectRatio: aspect_ratio || '1:1', callBackUrl: `${origin}/api/image-callback` },
      poll: 'https://api.kie.ai/api/v1/nano-banana-2/record-info',
    },
    {
      url: 'https://api.kie.ai/api/v1/image/nano-banana/generate',
      body: { prompt, aspectRatio: aspect_ratio || '1:1' },
      poll: 'https://api.kie.ai/api/v1/image/nano-banana/record-info',
    },
  ];

  let taskId = '';
  let pollBase = '';

  for (const ep of NANO_ENDPOINTS) {
    try {
      const res = await fetch(ep.url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${kieKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(ep.body),
        signal: AbortSignal.timeout(10000),
      });
      const data = await res.json();
      console.log(`Nano endpoint ${ep.url.split('/').pop()} -> HTTP:${res.status} code:${data.code} msg:${data.msg}`);

      if (data.code === 200 && data.data?.taskId) {
        taskId = data.data.taskId;
        pollBase = ep.poll;
        console.log('Nano Banana taskId:', taskId);
        break;
      }
    } catch (e) {
      console.log(`Nano endpoint failed:`, e instanceof Error ? e.message.slice(0, 50) : e);
    }
  }

  if (!taskId) {
    return NextResponse.json({ error: 'Nano Banana endpoint not found — check API documentation' }, { status: 500 });
  }

  // Poll
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 4000));
    const poll = await (await fetch(
      `${pollBase}?taskId=${taskId}`,
      { headers: { 'Authorization': `Bearer ${kieKey}` } }
    )).json();

    if (i < 3) console.log(`Nano poll #${i + 1}:`, JSON.stringify(poll).slice(0, 400));

    const d = poll?.data || {};
    const successFlag = d?.successFlag;
    const state = d?.status || d?.state;
    const response = d?.response;

    // successFlag pattern (same as FLUX)
    if (successFlag === 1 || state === 'SUCCESS') {
      let parsed = response;
      if (typeof response === 'string') {
        if (response.startsWith('http')) {
          await saveToDb(userId, userEmail, rawPrompt, response);
          return NextResponse.json({ imageUrl: response });
        }
        try { parsed = JSON.parse(response); } catch { parsed = response; }
      }
      const imageUrl = parsed?.resultImageUrl || parsed?.imageUrl || parsed?.image_url
        || parsed?.url || d?.imageUrl || d?.url || '';
      if (imageUrl) {
        await saveToDb(userId, userEmail, rawPrompt, imageUrl);
        return NextResponse.json({ imageUrl });
      }
      return NextResponse.json({ error: 'Nano Banana: image generated but URL not found' }, { status: 500 });
    }
    if (d?.errorCode || successFlag === -1 || state === 'FAILED') {
      return NextResponse.json({ error: `Nano Banana failed: ${d?.errorCode || state || 'unknown'}` }, { status: 500 });
    }
  }
  return NextResponse.json({ error: 'Timeout — please try again' }, { status: 408 });
}

async function saveToDb(userId: string, userEmail: string, prompt: string, imageUrl: string) {
  if (!userId) return;
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    // Ensure profile exists to prevent foreign key errors for OAuth users
    try { await supabase.from('profiles').upsert({ id: userId, email: userEmail || '' }, { onConflict: 'id', ignoreDuplicates: true }); } catch (e) {}
    
    // Insert into gen history
    const { error: insertErr } = await supabase
      .from('videos')
      .insert({ user_id: userId, prompt: prompt.slice(0, 200), video_url: imageUrl, type: 'image' });
    if (insertErr) { console.error('DB insert error (image):', insertErr.message); return; }
    console.log('✅ Image saved to DB for user:', userId);
    // Directly increment images_generated (no RPC function needed)
    const { data: profile } = await supabase.from('profiles').select('images_generated').eq('id', userId).single();
    const { error: updErr } = await supabase.from('profiles').update({ images_generated: (profile?.images_generated || 0) + 1 }).eq('id', userId);
    if (updErr) console.error('DB increment error (image):', updErr.message);
    else console.log('✅ images_generated incremented for user:', userId);
  } catch (e) { console.error('DB error:', e); }
}