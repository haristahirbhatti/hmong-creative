import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const formData  = await req.formData();
    const image     = formData.get('image') as File;
    const prompt    = formData.get('prompt') as string || '';
    const duration  = Number(formData.get('duration')) || 5;
    const userId    = formData.get('userId') as string || '';
    const userEmail = formData.get('userEmail') as string || '';

    if (!image) return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    const apiKey = process.env.KIE_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'KIE API key not configured' }, { status: 500 });

    // Step 1: Upload image
    const bytes  = await image.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');

    const uploadRes  = await fetch('https://kieai.redpandaai.co/api/file-base64-upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Data: `data:${image.type};base64,${base64}`, uploadPath: 'images', fileName: `upload-${Date.now()}.jpg` }),
    });
    const uploadData = await uploadRes.json();
    const imageUrl   = uploadData?.data?.downloadUrl || uploadData?.data?.fileUrl || uploadData?.data?.url;
    if (!imageUrl) return NextResponse.json({ error: `Upload failed: ${JSON.stringify(uploadData)}` }, { status: 500 });

    // Step 2: Generate video
    const createRes = await fetch('https://api.kie.ai/api/v1/runway/generate', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt || 'Smooth cinematic motion', imageUrl, duration: duration >= 10 ? 10 : 5, quality: '720p', aspectRatio: '16:9', waterMark: '' }),
    });
    const createData = await createRes.json();
    if (!createRes.ok || createData.code !== 200) return NextResponse.json({ error: createData.msg || 'Generation failed' }, { status: 500 });

    const taskId = createData.data?.taskId;
    if (!taskId) return NextResponse.json({ error: 'No task ID' }, { status: 500 });

    // Step 3: Poll
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const poll     = await (await fetch(`https://api.kie.ai/api/v1/runway/record-detail?taskId=${taskId}`, { headers: { 'Authorization': `Bearer ${apiKey}` } })).json();
      const state    = poll.data?.state;
      const videoUrl = poll.data?.videoInfo?.videoUrl;

      if (state === 'success' && videoUrl) {
        // Save to Supabase using service role (bypasses RLS, no RPC needed)
        if (userId) {
          try {
            const supabase = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );
            try { await supabase.from('profiles').upsert({ id: userId }, { onConflict: 'id', ignoreDuplicates: true }); } catch (e) {}

            // Insert generation record — use actual DB column names
            const { error: insertErr } = await supabase.from('videos').insert({
              user_id:   userId,
              prompt:    prompt || '',
              video_url: videoUrl,
              type:      'video',
            });
            if (!insertErr) {
              const { data: prof } = await supabase.from('profiles').select('videos_generated').eq('id', userId).single();
              await supabase.from('profiles').update({ videos_generated: (prof?.videos_generated || 0) + 1 }).eq('id', userId);
              console.log('✅ Video saved & incremented for user:', userId);
            } else { console.error('Video DB insert error:', insertErr.message); }

          } catch (dbErr) {
            console.error('DB save error (non-fatal):', dbErr);
          }
        }
        return NextResponse.json({ videoUrl });
      }

      if (state === 'fail' || state === 'error') return NextResponse.json({ error: poll.data?.failMsg || 'Failed' }, { status: 500 });
    }

    return NextResponse.json({ error: 'Timeout — try again' }, { status: 408 });

  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}
