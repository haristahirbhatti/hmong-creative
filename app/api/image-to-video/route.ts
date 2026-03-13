import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const image = formData.get('image') as File;
    const prompt = formData.get('prompt') as string || '';
    const duration = Number(formData.get('duration')) || 5;

    if (!image) return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    const apiKey = process.env.KIE_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'KIE API key not configured' }, { status: 500 });

    // Step 1: Upload image
    const bytes = await image.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');

    const uploadRes = await fetch('https://kieai.redpandaai.co/api/file-base64-upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base64Data: `data:${image.type};base64,${base64}`,
        uploadPath: 'images',
        fileName: `upload-${Date.now()}.jpg`,
      }),
    });

    const uploadData = await uploadRes.json();
    const imageUrl = uploadData?.data?.downloadUrl || uploadData?.data?.fileUrl || uploadData?.data?.url;

    if (!imageUrl) {
      return NextResponse.json({ error: `Upload failed: ${JSON.stringify(uploadData)}` }, { status: 500 });
    }

    // Step 2: Generate video
    // Docs: duration (5 or 10), quality ("720p" or "1080p"), aspectRatio ("16:9" or "9:16")
    // imageUrl is optional reference image field
    const reqBody = {
      prompt: prompt || 'Smooth cinematic motion, natural movement',
      imageUrl,                          // reference image to animate
      duration: duration >= 10 ? 10 : 5,
      quality: '720p',
      aspectRatio: '16:9',
      waterMark: '',
    };

    console.log('Generate body:', JSON.stringify({ ...reqBody, imageUrl: '[url]' }));

    const createRes = await fetch('https://api.kie.ai/api/v1/runway/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reqBody),
    });

    const createData = await createRes.json();
    console.log('KIE generate response:', JSON.stringify(createData));

    if (!createRes.ok || createData.code !== 200) {
      return NextResponse.json({ error: createData.msg || 'Video generation failed' }, { status: 500 });
    }

    const taskId = createData.data?.taskId;
    if (!taskId) {
      return NextResponse.json({ error: `No task ID. Response: ${JSON.stringify(createData)}` }, { status: 500 });
    }

    // Step 3: Poll for result
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const pollRes = await fetch(`https://api.kie.ai/api/v1/runway/record-detail?taskId=${taskId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      const poll = await pollRes.json();
      const state = poll.data?.state;
      const videoUrl = poll.data?.videoInfo?.videoUrl;
      console.log(`Poll #${i + 1} state: ${state}`);

      if (state === 'success' && videoUrl) return NextResponse.json({ videoUrl });
      if (state === 'fail' || state === 'error') {
        return NextResponse.json({ error: poll.data?.failMsg || 'Generation failed' }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Timeout — try again' }, { status: 408 });

  } catch (e: unknown) {
    console.error('KIE error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}