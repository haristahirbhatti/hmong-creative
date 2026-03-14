import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { prompt, aspect_ratio, style, userId, userEmail } = await req.json();
    if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 });

    const kieKey = process.env.KIE_API_KEY;
    if (!kieKey) return NextResponse.json({ error: 'KIE_API_KEY not set' }, { status: 500 });

    const kiePrompt = style ? `${prompt}, ${style} style` : prompt;

    // Generate
    const createRes = await fetch('https://api.kie.ai/api/v1/flux/kontext/generate', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${kieKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: kiePrompt,
        aspectRatio: aspect_ratio || '1:1',
        outputFormat: 'jpeg',
        model: 'flux-kontext-pro',
        safetyTolerance: 2,
        enableTranslation: true,
        promptUpsampling: false,
      }),
    });
    const createData = await createRes.json();
    console.log('Create:', createData.code, createData.msg, 'taskId:', createData.data?.taskId);

    if (createData.code !== 200 || !createData.data?.taskId) {
      return NextResponse.json({ error: createData.msg || 'Generation failed' }, { status: 500 });
    }

    const taskId = createData.data.taskId;

    // Poll — wait for successFlag: 1 and response to be populated
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 5000));

      const poll = await (await fetch(
        `https://api.kie.ai/api/v1/flux/kontext/record-info?taskId=${taskId}`,
        { headers: { 'Authorization': `Bearer ${kieKey}` } }
      )).json();

      const d = poll?.data || {};
      const successFlag = d?.successFlag;
      const errorCode = d?.errorCode;
      const response = d?.response;

      console.log(`Poll #${i + 1} successFlag:${successFlag} errorCode:${errorCode} response:${response ? 'present' : 'null'}`);

      // Done when successFlag === 1
      if (successFlag === 1 && response) {
        // Parse response — it may be a JSON string or object
        let parsed = response;
        if (typeof response === 'string') {
          try { parsed = JSON.parse(response); } catch { parsed = {}; }
        }
        console.log('Response parsed:', JSON.stringify(parsed).slice(0, 200));

        const imageUrl = parsed?.imageUrl
          || parsed?.image_url
          || parsed?.url
          || parsed?.images?.[0]
          || parsed?.data?.[0]?.url
          || parsed?.output?.[0]
          || (typeof parsed === 'string' ? parsed : null);

        if (imageUrl) {
          console.log('Image URL found:', imageUrl.slice(0, 80));
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
            } catch (e) { console.error('DB error:', e); }
          }
          return NextResponse.json({ imageUrl });
        }

        // successFlag=1 but can't find URL — log full response
        console.log('successFlag=1 but no URL found. Full response:', JSON.stringify(parsed));
        return NextResponse.json({ error: 'Image generated but URL not found. Check logs.' }, { status: 500 });
      }

      // Failed
      if (errorCode || successFlag === -1) {
        return NextResponse.json({ error: `Generation failed: ${errorCode || 'unknown error'}` }, { status: 500 });
      }

      // Still processing (successFlag: 0) — keep polling
    }

    return NextResponse.json({ error: 'Timeout — please try again' }, { status: 408 });

  } catch (e: unknown) {
    console.error('Create image error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}