import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { prompt, style, instrumental } = await req.json();
    if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 });

    const apiKey = process.env.KIE_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'KIE API key not configured' }, { status: 500 });

    // Suno API — POST /api/v1/generate
    // customMode: false = only prompt required (simple mode)
    // customMode: true  = style + title also required
    const reqBody = {
      prompt,
      customMode: true,
      instrumental: instrumental ?? true,
      model: 'V4',
      style: style || 'cinematic',
      title: 'Hmong Creative Track',
    };

    console.log('Suno request body:', JSON.stringify(reqBody));

    const createRes = await fetch('https://api.kie.ai/api/v1/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reqBody),
    });

    const createData = await createRes.json();
    console.log('Suno create response:', JSON.stringify(createData));

    if (!createRes.ok || createData.code !== 200) {
      return NextResponse.json({ error: createData.msg || 'Audio generation failed' }, { status: 500 });
    }

    const taskId = createData.data?.taskId;
    if (!taskId) {
      return NextResponse.json({ error: `No task ID. Response: ${JSON.stringify(createData)}` }, { status: 500 });
    }

    // Poll using GET /api/v1/suno/record-info?taskId=
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 5000));

      const pollRes = await fetch(`https://api.kie.ai/api/v1/suno/record-info?taskId=${taskId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      const poll = await pollRes.json();
      const status = poll.data?.status;
      console.log(`Suno poll #${i + 1} status:`, status);

      if (status === 'SUCCESS') {
        const clips = poll.data?.response?.sunoData || [];
        const audioUrl = clips[0]?.audioUrl || clips[0]?.audio_url;
        if (audioUrl) return NextResponse.json({ audioUrl, clips });
      }
      if (status === 'FAILED' || status === 'ERROR') {
        return NextResponse.json({ error: 'Audio generation failed' }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Timeout — try again' }, { status: 408 });

  } catch (e: unknown) {
    console.error('Audio error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}