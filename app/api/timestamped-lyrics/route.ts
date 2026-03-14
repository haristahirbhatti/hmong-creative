import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { taskId, audioId } = await req.json();
        if (!taskId) return NextResponse.json({ error: 'taskId required' }, { status: 400 });

        const apiKey = process.env.KIE_API_KEY;
        if (!apiKey) return NextResponse.json({ error: 'KIE_API_KEY not set' }, { status: 500 });

        // Build URL — audioId is optional
        const url = audioId
            ? `https://api.kie.ai/api/v1/generate/get-timestamped-lyrics?taskId=${taskId}&audioId=${audioId}`
            : `https://api.kie.ai/api/v1/generate/get-timestamped-lyrics?taskId=${taskId}`;

        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        const data = await res.json();
        console.log('Timestamped lyrics raw:', JSON.stringify(data).slice(0, 400));

        if (!res.ok || data.code !== 200) {
            return NextResponse.json({ error: data.msg || 'Failed to fetch timestamps' }, { status: 500 });
        }

        // Parse word-level timestamps — try multiple shapes
        const payload = data.data || data;
        const words: { word: string; startTime: number; endTime: number }[] =
            payload?.words ||
            payload?.timestamps ||
            payload?.lrcData?.words ||
            payload?.response?.words ||
            [];

        // Also return raw LRC string if present
        const lrc: string = payload?.lrc || payload?.lrcData?.lrc || payload?.response?.lrc || '';

        return NextResponse.json({ words, lrc });
    } catch (e: unknown) {
        console.error('Timestamped lyrics error:', e);
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
    }
}
