import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { taskId } = await req.json();
        if (!taskId) return NextResponse.json({ error: 'taskId required' }, { status: 400 });

        const apiKey = process.env.KIE_API_KEY;
        if (!apiKey) return NextResponse.json({ error: 'KIE_API_KEY not set' }, { status: 500 });

        const createRes = await fetch('https://api.kie.ai/api/v1/midi/generate', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId, callBackUrl: `${req.nextUrl.origin}/api/midi-callback` }),
        });
        const createData = await createRes.json();
        console.log('MIDI create:', JSON.stringify(createData).slice(0, 200));

        const midiTaskId = createData.data?.taskId;
        if (!midiTaskId) return NextResponse.json({ error: createData.msg || 'Failed to start MIDI' }, { status: 500 });

        for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 4000));
            const poll = await (await fetch(
                `https://api.kie.ai/api/v1/midi/record-info?taskId=${midiTaskId}`,
                { headers: { 'Authorization': `Bearer ${apiKey}` } }
            )).json();

            if (i < 2) console.log(`MIDI poll #${i + 1}:`, JSON.stringify(poll).slice(0, 300));

            const d = poll?.data; const r = d?.response || d;
            const state = d?.status || d?.state;
            const midiUrl = r?.midiUrl || r?.midi_url || r?.url || d?.midiUrl;

            if (midiUrl) return NextResponse.json({ midiUrl });
            if (state === 'FAILED' || state === 'fail' || state === 'error') return NextResponse.json({ error: 'MIDI generation failed' }, { status: 500 });
        }
        return NextResponse.json({ error: 'Timeout — try again' }, { status: 408 });
    } catch (e: unknown) {
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
    }
}