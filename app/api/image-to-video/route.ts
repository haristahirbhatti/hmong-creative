import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const image    = formData.get('image') as File;
    const prompt   = formData.get('prompt') as string || '';
    const duration = Number(formData.get('duration')) || 5;

    if (!image) return NextResponse.json({ error: 'No image provided' }, { status: 400 });

    const apiKey = process.env.FAL_KEY;
    if (!apiKey) return NextResponse.json({ error: 'fal.ai API key not configured' }, { status: 500 });

    // Set API key via env (fal reads FAL_KEY automatically)
    process.env.FAL_KEY = apiKey;

    // Step 1: Upload image to fal storage
    const imageFile = new File([await image.arrayBuffer()], image.name || 'image.jpg', { type: image.type });
    const imageUrl  = await fal.storage.upload(imageFile);

    // Step 2: Generate video using Kling v1 Standard
    const result = await fal.subscribe('fal-ai/kling-video/v1/standard/image-to-video', {
      input: {
        image_url:  imageUrl,
        prompt:     prompt || 'Smooth cinematic motion, natural movement',
        duration:   duration >= 10 ? '10' : '5',
        cfg_scale:  0.5,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const videoUrl = (result as any).data?.video?.url || (result as any).video?.url;
    if (!videoUrl) return NextResponse.json({ error: 'No video returned from fal.ai' }, { status: 500 });

    return NextResponse.json({ videoUrl });

  } catch (e: unknown) {
    console.error('fal.ai error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Generation failed' }, { status: 500 });
  }
}
