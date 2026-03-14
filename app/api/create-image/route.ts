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
        callBackUrl: 'https://hmong-creative.vercel.app/api/image-callback',
      }),
    });
    const createData = await createRes.json();
    console.log('Create-image full response:', JSON.stringify(createData).slice(0, 300));

    if (createData.code !== 200 || !createData.data?.taskId) {
      return NextResponse.json({ error: createData.msg || `KIE error: ${JSON.stringify(createData)}` }, { status: 500 });
    }

    const taskId = createData.data.taskId;

    // Poll — wait for image URL
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 5000));

      const pollRes = await fetch(
        `https://api.kie.ai/api/v1/flux/kontext/record-info?taskId=${taskId}`,
        { headers: { 'Authorization': `Bearer ${kieKey}` } }
      );
      const poll = await pollRes.json();

      // Log first 3 polls fully so we can see the exact structure
      if (i < 3) console.log(`Poll #${i + 1} full:`, JSON.stringify(poll).slice(0, 500));

      const d = poll?.data || {};
      const successFlag = d?.successFlag;
      const errorCode = d?.errorCode;
      const response = d?.response;

      console.log(`Poll #${i + 1} successFlag:${successFlag} errorCode:${errorCode}`);

      if (successFlag === 1) {
        // Parse response — may be a JSON string, a plain URL string, or an object
        let parsed = response;
        if (typeof response === 'string') {
          // Could be a direct URL or JSON
          if (response.startsWith('http')) {
            // It's the image URL directly
            const imageUrl = response;
            await saveToDb(userId, userEmail, prompt, imageUrl);
            return NextResponse.json({ imageUrl });
          }
          try { parsed = JSON.parse(response); } catch { parsed = response; }
        }

        console.log('Parsed response:', JSON.stringify(parsed).slice(0, 300));

        // Try every possible field name KIE might use
        // KIE Flux Kontext returns: data.response.resultImageUrl
        const imageUrl: string =
          parsed?.resultImageUrl ||
          parsed?.originImageUrl ||
          parsed?.imageUrl ||
          parsed?.image_url ||
          parsed?.url ||
          parsed?.images?.[0] ||
          parsed?.images?.[0]?.url ||
          parsed?.data?.[0]?.url ||
          parsed?.output?.[0] ||
          parsed?.result ||
          parsed?.fileUrl ||
          // Also check top-level data fields
          d?.resultImageUrl ||
          d?.originImageUrl ||
          d?.imageUrl ||
          d?.image_url ||
          d?.url ||
          d?.fileUrl ||
          '';

        if (imageUrl) {
          console.log('Image URL found:', imageUrl.slice(0, 100));
          await saveToDb(userId, userEmail, prompt, imageUrl);
          return NextResponse.json({ imageUrl });
        }

        // successFlag=1 but no URL — log and return error with full data
        console.log('successFlag=1 but no URL. Full d:', JSON.stringify(d).slice(0, 500));
        return NextResponse.json({
          error: 'Image generated but URL not found. Please try again.',
        }, { status: 500 });
      }

      // Failed
      if (errorCode || successFlag === -1) {
        return NextResponse.json({ error: `Generation failed: ${errorCode || 'unknown error'}` }, { status: 500 });
      }
      // successFlag === 0 = still processing, keep polling
    }

    return NextResponse.json({ error: 'Timeout — please try again' }, { status: 408 });

  } catch (e: unknown) {
    console.error('Create image error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}

async function saveToDb(userId: string, userEmail: string, prompt: string, imageUrl: string) {
  if (!userId) return;
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