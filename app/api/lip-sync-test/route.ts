import { NextResponse } from 'next/server';

export async function GET() {
    const apiKey = process.env.KIE_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'No API key' });

    const results: Record<string, unknown> = {};

    const tests = [
        { key: 'market/generate', url: 'https://api.kie.ai/api/v1/market/generate', body: { model: 'kling-ai-avatar-standard', image_url: 'https://example.com/a.jpg', audio_url: 'https://example.com/a.mp3', prompt: 'test' } },
        { key: 'kling/ai-avatar/generate', url: 'https://api.kie.ai/api/v1/kling/ai-avatar/generate', body: { image_url: 'https://example.com/a.jpg', audio_url: 'https://example.com/a.mp3', prompt: 'test' } },
        { key: 'kling/ai-avatar-std/generate', url: 'https://api.kie.ai/api/v1/kling/ai-avatar-standard/generate', body: { image_url: 'https://example.com/a.jpg', audio_url: 'https://example.com/a.mp3', prompt: 'test' } },
    ];

    for (const ep of tests) {
        try {
            const res = await fetch(ep.url, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(ep.body),
                signal: AbortSignal.timeout(8000),
            });
            const text = await res.text();
            let data: unknown;
            try { data = JSON.parse(text); } catch { data = text.slice(0, 300); }
            results[ep.key] = { httpStatus: res.status, response: data };
        } catch (e) {
            results[ep.key] = { error: e instanceof Error ? e.message : String(e) };
        }
    }

    return NextResponse.json(results);
}