import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 300;

const UPLOAD_BASE = 'https://kieai.redpandaai.co';
const API_BASE = 'https://api.kie.ai';

export async function POST(req: NextRequest) {
    try {
        let formData: FormData;
        try {
            formData = await req.formData();
        } catch (e) {
            console.error('FormData parse error:', e);
            return NextResponse.json({ error: 'File too large. Please use a file under 4MB.' }, { status: 400 });
        }

        const audioFile = formData.get('audio') as File | null;
        const style = (formData.get('style') as string) || '';
        const language = (formData.get('language') as string) || '';
        const lyrics = (formData.get('lyrics') as string) || '';
        const userId = (formData.get('userId') as string) || '';

        const apiKey = process.env.KIE_API_KEY;
        if (!apiKey) return NextResponse.json({ error: 'KIE_API_KEY not set' }, { status: 500 });
        if (!audioFile) return NextResponse.json({ error: 'Audio file required' }, { status: 400 });

        if (audioFile.size > 4 * 1024 * 1024) {
            return NextResponse.json({
                error: `File is ${(audioFile.size / 1024 / 1024).toFixed(1)}MB. Please use a file under 4MB.`
            }, { status: 400 });
        }

        // ── Step 1: Upload audio ───────────────────────────────────────────
        console.log('Uploading audio file...');
        const bytes = await audioFile.arrayBuffer();
        const base64 = Buffer.from(bytes).toString('base64');

        let uploadData;
        try {
            const uploadRes = await fetch(`${UPLOAD_BASE}/api/file-base64-upload`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    base64Data: `data:${audioFile.type || 'audio/mpeg'};base64,${base64}`,
                    uploadPath: 'audio',
                    fileName: `cover-${Date.now()}.mp3`,
                }),
            });
            const text = await uploadRes.text();
            try { uploadData = JSON.parse(text); }
            catch { return NextResponse.json({ error: 'File upload failed — server error' }, { status: 500 }); }
        } catch {
            return NextResponse.json({ error: 'Upload failed — network error' }, { status: 500 });
        }

        const uploadUrl =
            uploadData?.data?.downloadUrl ||
            uploadData?.data?.fileUrl ||
            uploadData?.data?.url ||
            '';
        if (!uploadUrl)
            return NextResponse.json({ error: `Upload failed: ${JSON.stringify(uploadData).slice(0, 100)}` }, { status: 500 });

        console.log('Uploaded URL:', uploadUrl.slice(0, 80));

        // ── Step 2: Build request body ────────────────────────────────────
        //
        // IMPORTANT — Suno SENSITIVE_WORD_ERROR fix:
        // Suno's content filter often blocks non-Latin scripts (Urdu, Hindi, etc.)
        // even when the content is harmless.
        //
        // Strategy:
        //  - If user provides lyrics → customMode:true, use exact lyrics
        //  - Always keep style/prompt short and clean (no special chars)
        //  - Strip any characters that might trigger the filter
        //
        let body: Record<string, unknown>;

        // Clean lyrics — remove characters that might trigger Suno's filter
        const cleanLyrics = lyrics
            .trim()
            // Remove URLs, emails
            .replace(/https?:\/\/\S+/g, '')
            .replace(/\S+@\S+/g, '')
            // Trim each line
            .split('\n').map(l => l.trim()).join('\n')
            .trim();

        const cleanStyle = [
            style.replace(/[^\w\s,.-]/g, '').trim(),
            language ? `${language} language` : '',
        ].filter(Boolean).join(', ').slice(0, 200) || 'pop';

        if (cleanLyrics) {
            // customMode:true → AI sings your exact lyrics
            body = {
                uploadUrl,
                customMode: true,
                instrumental: false,
                model: 'V5',
                style: cleanStyle,
                title: 'Cover',
                prompt: cleanLyrics.slice(0, 3000),
                callBackUrl: `${req.nextUrl.origin}/api/cover-callback`,
            };
            console.log('customMode=true, lyrics lines:', cleanLyrics.split('\n').length, 'lang:', language);
        } else {
            // customMode:false → Suno auto-generates lyrics
            const prompt = [
                style || 'pop cover version',
                language ? `sung in ${language}` : '',
            ].filter(Boolean).join(', ').replace(/[^\w\s,.-]/g, '').slice(0, 500);

            body = {
                uploadUrl,
                customMode: false,
                instrumental: false,
                model: 'V5',
                prompt,
                callBackUrl: `${req.nextUrl.origin}/api/cover-callback`,
            };
            console.log('customMode=false, prompt:', body.prompt);
        }

        // ── Step 3: Submit task ───────────────────────────────────────────
        let taskId: string | undefined;
        try {
            const res = await fetch(`${API_BASE}/api/v1/generate/upload-cover`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const text = await res.text();
            let data;
            try { data = JSON.parse(text); } catch { console.error('Not JSON:', text.slice(0, 200)); }
            console.log('upload-cover: code=', data?.code, 'msg=', data?.msg);
            taskId = data?.data?.taskId as string | undefined;
        } catch (e) { console.error('Cover request error:', e); }

        if (!taskId)
            return NextResponse.json({ error: 'Cover generation failed to start. Check API credits.' }, { status: 500 });

        console.log('taskId:', taskId);

        // ── Step 4: Poll for result ───────────────────────────────────────
        for (let i = 0; i < 40; i++) {
            await new Promise(r => setTimeout(r, 5000));
            try {
                const pollRes = await fetch(
                    `${API_BASE}/api/v1/generate/record-info?taskId=${taskId}`,
                    { headers: { Authorization: `Bearer ${apiKey}` } },
                );
                const text = await pollRes.text();
                let poll;
                try { poll = JSON.parse(text); } catch { continue; }

                if (i < 2) console.log(`Poll #${i + 1}:`, JSON.stringify(poll).slice(0, 200));

                const d = poll?.data;
                const state = d?.status as string | undefined;

                console.log(`Poll #${i + 1} state:${state}`);

                // ✅ Immediately return on any failure state — no more 30-poll loops
                if (state === 'CREATE_TASK_FAILED' || state === 'GENERATE_AUDIO_FAILED') {
                    return NextResponse.json(
                        { error: `Generation failed: ${d?.errorMessage || state}` },
                        { status: 500 },
                    );
                }

                // ✅ KEY FIX: SENSITIVE_WORD_ERROR — return immediately with helpful message
                if (state === 'SENSITIVE_WORD_ERROR') {
                    return NextResponse.json({
                        error: `Suno's content filter blocked this request (SENSITIVE_WORD_ERROR). Try these fixes:\n\n1. Write lyrics in Roman/English script instead of native script\n2. Example: "Gal sun mere tu mutiyare" instead of Urdu/Hindi script\n3. Or leave the Lyrics field empty and just set Language to get an auto-generated cover`,
                    }, { status: 422 });
                }

                if (state === 'FIRST_SUCCESS' || state === 'SUCCESS') {
                    const sunoData: { audioUrl?: string; audio_url?: string }[] =
                        d?.response?.sunoData || [];

                    const covers = sunoData
                        .map(c => c.audioUrl || c.audio_url || '')
                        .filter(Boolean)
                        .map(url => ({ audioUrl: url }));

                    if (covers.length > 0) {
                        console.log(`Done! ${covers.length} cover(s) ready`);
                        // Save to DB
                        if (userId) {
                            try {
                                const supabase = createClient(
                                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                                    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                                );
                                try { await supabase.from('profiles').upsert({ id: userId }, { onConflict: 'id', ignoreDuplicates: true }); } catch (e) {}
                                const { error: dbErr } = await supabase.from('videos').insert({
                                    user_id: userId,
                                    prompt: style || 'cover audio',
                                    video_url: covers[0].audioUrl,
                                    type: 'audio',
                                });
                                if (!dbErr) {
                                    const { data: prof } = await supabase.from('profiles').select('audio_generated').eq('id', userId).single();
                                    await supabase.from('profiles').update({ audio_generated: (prof?.audio_generated || 0) + 1 }).eq('id', userId);
                                    console.log('✅ Cover audio saved & incremented for user:', userId);
                                } else { console.error('Cover audio DB insert error:', dbErr.message); }
                            } catch (e) { console.error('Cover audio DB error:', e); }
                        }
                        return NextResponse.json({ audioUrl: covers[0].audioUrl, clips: covers });
                    }
                }
                // PENDING / TEXT_SUCCESS — keep polling
            } catch (e) { console.error(`Poll ${i + 1} error:`, e); }
        }

        return NextResponse.json({ error: 'Timeout — please try again' }, { status: 408 });

    } catch (e: unknown) {
        console.error('Cover audio error:', e);
        return NextResponse.json(
            { error: e instanceof Error ? e.message : 'Server error' },
            { status: 500 },
        );
    }
}