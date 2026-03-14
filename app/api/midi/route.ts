import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { taskId } = await req.json();
        if (!taskId) return NextResponse.json({ error: 'taskId (from vocal separation) required' }, { status: 400 });

        const apiKey = process.env.KIE_API_KEY;
        if (!apiKey) return NextResponse.json({ error: 'KIE_API_KEY not set' }, { status: 500 });

        // Create MIDI generation task (requires completed vocal separation taskId)
        const createRes = await fetch('https://api.kie.ai/api/v1/midi/generate', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                taskId,
                callBackUrl: 'https://hmong-creative.vercel.app/api/midi-callback',
            }),
        });
        const createData = await createRes.json();
        console.log('MIDI create:', JSON.stringify(createData).slice(0, 200));

        const midiTaskId = createData.data?.taskId;
        if (!midiTaskId) return NextResponse.json({ error: createData.msg || 'Failed to start MIDI task' }, { status: 500 });

        // Poll for result
        for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 4000));

            const poll = await (await fetch(
                `https://api.kie.ai/api/v1/midi/record-info?taskId=${midiTaskId}`,
                { headers: { 'Authorization': `Bearer ${apiKey}` } }
            )).json();

            if (i < 2) console.log(`MIDI poll #${i + 1}:`, JSON.stringify(poll).slice(0, 300));

            const data = poll?.data;
            const state = data?.status || data?.state;
            const response = data?.response || data;

            const midiUrl =
                response?.midiUrl || response?.midi_url || response?.url ||
                data?.midiUrl || data?.midi_url;

            if (midiUrl) {
                return NextResponse.json({ midiUrl });
            }

            if (state === 'FAILED' || state === 'fail' || state === 'error') {
                return NextResponse.json({ error: 'MIDI generation failed' }, { status: 500 });
            }
        }

        return NextResponse.json({ error: 'Timeout — try again' }, { status: 408 });
    } catch (e: unknown) {
        console.error('MIDI error:', e);
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
    }
}
