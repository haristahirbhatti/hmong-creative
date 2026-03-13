import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { prompt, aspect_ratio, style } = await req.json();
    if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 });

    const apiKey = process.env.KIE_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'KIE API key not configured' }, { status: 500 });

    // Flux Kontext — POST /api/v1/flux/kontext/generate (exact from docs)
    const reqBody = {
      prompt: `${prompt}${style ? `, ${style} style` : ''}`,
      enableTranslation: true,
      aspectRatio: aspect_ratio || '1:1',
      outputFormat: 'jpeg',
      promptUpsampling: false,
      model: 'flux-kontext-pro',
      safetyTolerance: 2,
    };

    console.log('Flux request body:', JSON.stringify(reqBody));

    const createRes = await fetch('https://api.kie.ai/api/v1/flux/kontext/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reqBody),
    });

    const createData = await createRes.json();
    console.log('Flux create response:', JSON.stringify(createData));

    if (!createRes.ok || createData.code !== 200) {
      return NextResponse.json({ error: createData.msg || 'Image generation failed' }, { status: 500 });
    }

    const taskId = createData.data?.taskId;
    if (!taskId) {
      return NextResponse.json({ error: `No task ID. Response: ${JSON.stringify(createData)}` }, { status: 500 });
    }

    // Poll using GET /api/v1/flux/record-info?taskId=
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 3000));

      const pollRes = await fetch(`https://api.kie.ai/api/v1/flux/record-info?taskId=${taskId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      const poll = await pollRes.json();
      const status = poll.data?.status;
      console.log(`Flux poll #${i + 1} status:`, status);

      if (status === 'SUCCESS') {
        const imageUrl = poll.data?.response?.imageUrl || poll.data?.imageUrl;
        if (imageUrl) return NextResponse.json({ imageUrl });
      }
      if (status === 'FAILED' || status === 'ERROR') {
        return NextResponse.json({ error: 'Image generation failed' }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Timeout — try again' }, { status: 408 });

  } catch (e: unknown) {
    console.error('Image error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}