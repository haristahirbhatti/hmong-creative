import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { prompt, style, duration, instrumental } = await req.json();
    if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 });

    const apiKey = process.env.KIE_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'KIE API key not configured' }, { status: 500 });

    // Suno V4 via kie.ai
    const createRes = await fetch('https://api.kie.ai/api/v1/suno/v4/music', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        style: style || 'cinematic',
        duration: duration || 30,
        instrumental: instrumental ?? true,
        model: 'V4',
      }),
    });

    const createData = await createRes.json();
    console.log('KIE audio create:', JSON.stringify(createData));

    if (!createRes.ok) {
      return NextResponse.json({ error: createData.msg || 'Audio API error' }, { status: 500 });
    }

    const taskId = createData.data?.taskId;
    if (!taskId) {
      return NextResponse.json({ error: `No task ID. Response: ${JSON.stringify(createData)}` }, { status: 500 });
    }

    // Poll using suno-specific endpoint
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 5000));

      const pollRes = await fetch(`https://api.kie.ai/api/v1/suno/record-info?taskId=${taskId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      const poll = await pollRes.json();
      console.log('KIE audio poll state:', poll.data?.status || poll.data?.state);

      const status = poll.data?.status || poll.data?.state;
      const clips = poll.data?.response?.clips || poll.data?.clips || [];
      const audioUrl = clips[0]?.audio_url || poll.data?.audioUrl;

      if ((status === 'complete' || status === 'success') && audioUrl) {
        return NextResponse.json({ audioUrl, clips });
      }
      if (status === 'error' || status === 'failed') {
        return NextResponse.json({ error: 'Audio generation failed' }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Timeout — try again' }, { status: 408 });

  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}