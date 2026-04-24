'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthGuard from '../components/AuthGuard';
import { createClient } from '../../lib/supabase';

// ✅ Vercel 4.5MB limit — keep files small so base64 stays under limit
const MAX_IMAGE_MB = 2;  // 2MB image
const MAX_AUDIO_MB = 1;  // 1MB audio
// After base64 encoding (+33%): 2MB → 2.7MB + 1MB → 1.3MB = ~4MB total ✅

function LipSyncContent() {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState('');
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [audioDuration, setAudioDuration] = useState(0);
    const [prompt, setPrompt] = useState('natural lip sync, realistic facial expressions');
    const [model, setModel] = useState<'standard' | 'pro'>('standard');
    const [status, setStatus] = useState<'idle' | 'generating' | 'done' | 'error'>('idle');
    const [videoUrl, setVideoUrl] = useState('');
    const [error, setError] = useState('');
    const [progress, setProgress] = useState(0);
    const [dragOver, setDragOver] = useState(false);
    const [userId, setUserId] = useState('');
    const router = useRouter();
    const supabase = createClient();
    const audioCheckRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user: u } }: { data: { user: { id: string } | null } }) => {
            if (u) setUserId(u.id);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleImageFile = (file: File) => {
        if (!file.type.startsWith('image/')) {
            setError('Please upload an image file (JPG, PNG, WEBP)'); return;
        }
        // ✅ Strict 2MB limit for Vercel
        if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
            setError(`Image is ${(file.size / 1024 / 1024).toFixed(1)}MB — max ${MAX_IMAGE_MB}MB allowed. Please compress your image (use tinypng.com or similar).`);
            return;
        }
        setImageFile(file); setImagePreview(URL.createObjectURL(file)); setError('');
    };

    const handleAudioFile = (file: File) => {
        if (!file.type.startsWith('audio/')) {
            setError('Please upload an audio file (MP3, WAV, AAC)'); return;
        }
        // ✅ Strict 1MB limit for Vercel
        if (file.size > MAX_AUDIO_MB * 1024 * 1024) {
            setError(`Audio is ${(file.size / 1024 / 1024).toFixed(1)}MB — max ${MAX_AUDIO_MB}MB allowed. Please trim or compress your audio.`);
            return;
        }

        // Check duration
        const url = URL.createObjectURL(file);
        const audio = new Audio(url);
        audio.onloadedmetadata = () => {
            const dur = audio.duration;
            URL.revokeObjectURL(url);
            if (dur > 15) {
                setError(`Audio is ${dur.toFixed(1)}s — max 15 seconds allowed. Please trim and re-upload.`);
                setAudioFile(null); setAudioDuration(0); return;
            }
            setAudioDuration(dur); setAudioFile(file); setError('');
        };
        audio.onerror = () => {
            URL.revokeObjectURL(url);
            setAudioFile(file); setAudioDuration(0); setError('');
        };
    };

    const handleGenerate = async () => {
        if (!imageFile) { setError('Please upload a photo'); return; }
        if (!audioFile) { setError('Please upload an audio file'); return; }
        if (audioDuration > 15) { setError(`Audio is ${audioDuration.toFixed(1)}s — max 15 seconds.`); return; }
        setStatus('generating'); setError(''); setProgress(5);
        const interval = setInterval(() => setProgress(p => Math.min(p + 1, 90)), 4000);
        try {
            const fd = new FormData();
            fd.append('image', imageFile);
            fd.append('audio', audioFile);
            fd.append('prompt', prompt);
            fd.append('model', model);
            if (userId) fd.append('userId', userId);
            const res = await fetch('/api/lip-sync', { method: 'POST', body: fd });
            clearInterval(interval);
            const text = await res.text();
            let data: { error?: string; videoUrl?: string };
            try { data = JSON.parse(text); }
            catch { throw new Error(`Server error: ${text.slice(0, 100)}`); }
            if (!res.ok) throw new Error(data.error || 'Generation failed');
            setVideoUrl(data.videoUrl || '');
            setProgress(100); setStatus('done');
        } catch (e: unknown) {
            clearInterval(interval);
            setError(e instanceof Error ? e.message : 'Generation failed');
            setStatus('error'); setProgress(0);
        }
    };

    const PROMPT_EXAMPLES = [
        'Natural lip sync, warm smile',
        'Expressive emotions, cinematic',
        'Professional presenter style',
        'Energetic performance',
        'Soft and emotional expression',
    ];

    const canGenerate = imageFile && audioFile && status !== 'generating';

    return (
        <div style={{ minHeight: '100vh', background: '#080808', fontFamily: "var(--font-body,'DM Sans',system-ui,sans-serif)", color: 'white' }}>
            <audio ref={audioCheckRef} style={{ display: 'none' }} />

            {/* Navbar */}
            <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 32px)', maxWidth: 1200, background: 'rgba(255,255,255,0.96)', borderRadius: 100, padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 9999, boxShadow: '0 4px 40px rgba(0,0,0,0.12)' }}>
                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                    <div style={{ width: 30, height: 30, background: '#080808', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, color: 'white' }}>H</div>
                    <span style={{ fontFamily: "var(--font-heading,'Syne',system-ui,sans-serif)", fontWeight: 800, fontSize: 15, color: '#080808' }}>Hmong Creative</span>
                </Link>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => router.back()} style={{ padding: '8px 16px', borderRadius: 100, border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', color: '#555', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
                    <Link href="/dashboard" style={{ background: '#080808', color: 'white', padding: '8px 18px', borderRadius: 100, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Dashboard</Link>
                </div>
            </div>

            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '100px 24px 80px' }}>

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 48 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,92,43,0.1)', border: '1px solid rgba(255,92,43,0.3)', borderRadius: 100, padding: '6px 18px', marginBottom: 20 }}>
                        <span>🎭</span>
                        <span style={{ color: '#FF5C2B', fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Powered by Kling AI via kie.ai</span>
                    </div>
                    <h1 style={{ fontFamily: "var(--font-heading,'Syne',system-ui,sans-serif)", fontSize: 'clamp(36px,5vw,60px)', fontWeight: 800, letterSpacing: -2, marginBottom: 12, lineHeight: 1 }}>Lip Sync Avatar</h1>
                    <p style={{ color: '#555', fontSize: 16, maxWidth: 460, margin: '0 auto' }}>Upload a photo and audio — AI will make your avatar speak with perfect lip sync</p>
                </div>

                {/* Model selector */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 480, margin: '0 auto 36px' }}>
                    {([
                        { id: 'standard' as const, name: 'Standard', desc: 'Fast & great quality', icon: '⚡' },
                        { id: 'pro' as const, name: 'Pro', desc: 'Best quality & detail', icon: '✦' },
                    ]).map(m => (
                        <button key={m.id} onClick={() => setModel(m.id)}
                            style={{ padding: '14px 16px', borderRadius: 14, border: `2px solid ${model === m.id ? '#FF5C2B' : 'rgba(255,255,255,0.07)'}`, background: model === m.id ? 'rgba(255,92,43,0.1)' : '#111', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.2s' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <span style={{ fontSize: 18 }}>{m.icon}</span>
                                <span style={{ fontSize: 14, fontWeight: 700, color: model === m.id ? 'white' : '#666' }}>{m.name}</span>
                            </div>
                            <div style={{ fontSize: 11, color: model === m.id ? '#aaa' : '#333' }}>{m.desc}</div>
                        </button>
                    ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

                    {/* LEFT */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                        {/* Photo upload */}
                        <div style={{ background: '#111', borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <span style={{ fontSize: 12, color: '#555', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>🖼️ Upload Photo</span>
                                <span style={{ fontSize: 11, color: '#333', marginLeft: 8 }}>JPG, PNG, WEBP</span>
                            </div>

                            {/* ✅ Image size warning */}
                            <div style={{ margin: '10px 16px 0', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.25)', borderRadius: 10, padding: '8px 12px' }}>
                                <span style={{ fontSize: 14, flexShrink: 0 }}>⚠️</span>
                                <span style={{ fontSize: 11, color: '#ffaa00', lineHeight: 1.5 }}>
                                    <strong>Max {MAX_IMAGE_MB}MB</strong> — compress at tinypng.com if needed
                                </span>
                            </div>

                            <div style={{ padding: 16 }}>
                                <label
                                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleImageFile(f); }}
                                    style={{ display: 'block', cursor: 'pointer' }}>
                                    <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }} style={{ display: 'none' }} />
                                    {imagePreview ? (
                                        <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={imagePreview} alt="preview" style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 12 }} />
                                            <div style={{ position: 'absolute', bottom: 8, right: 8, padding: '4px 10px', borderRadius: 20, background: 'rgba(0,0,0,0.7)', color: '#aaa', fontSize: 11 }}>Click to change</div>
                                            {imageFile && (
                                                <div style={{ position: 'absolute', top: 8, left: 8, padding: '4px 10px', borderRadius: 20, background: imageFile.size <= MAX_IMAGE_MB * 1024 * 1024 ? 'rgba(0,200,0,0.8)' : 'rgba(255,0,0,0.8)', color: 'white', fontSize: 11, fontWeight: 600 }}>
                                                    {(imageFile.size / 1024 / 1024).toFixed(1)}MB {imageFile.size <= MAX_IMAGE_MB * 1024 * 1024 ? '✅' : '❌'}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div style={{ height: 220, borderRadius: 12, border: `2px dashed ${dragOver ? '#FF5C2B' : 'rgba(255,255,255,0.1)'}`, background: dragOver ? 'rgba(255,92,43,0.05)' : 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, transition: 'all 0.2s' }}>
                                            <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(255,92,43,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🧑</div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: 14, fontWeight: 600, color: '#777', marginBottom: 4 }}>Upload a face photo</div>
                                                <div style={{ fontSize: 11, color: '#333' }}>Clear front-facing photo · max {MAX_IMAGE_MB}MB</div>
                                            </div>
                                            <div style={{ padding: '8px 18px', borderRadius: 100, background: '#FF5C2B', color: 'white', fontSize: 12, fontWeight: 700 }}>Browse Files</div>
                                        </div>
                                    )}
                                </label>
                            </div>
                        </div>

                        {/* Audio upload */}
                        <div style={{ background: '#111', borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)', padding: '14px 20px' }}>
                            <div style={{ marginBottom: 6 }}>
                                <span style={{ fontSize: 12, color: '#555', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>🎵 Upload Audio</span>
                                <span style={{ fontSize: 11, color: '#333', marginLeft: 8 }}>MP3, WAV, AAC</span>
                            </div>

                            {/* ✅ Audio limits warning */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.25)', borderRadius: 10, padding: '8px 12px', marginBottom: 10 }}>
                                <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>⚠️</span>
                                <div style={{ fontSize: 11, color: '#ffaa00', lineHeight: 1.6 }}>
                                    <strong>Max 15 seconds &amp; max {MAX_AUDIO_MB}MB</strong><br />
                                    Trim to under 15s and compress to under 1MB.<br />
                                    <span style={{ color: '#886600' }}>Use mp3smaller.com or Audacity to compress.</span>
                                </div>
                            </div>

                            <label style={{ display: 'block', cursor: 'pointer' }}>
                                <input type="file" accept="audio/*" onChange={e => { const f = e.target.files?.[0]; if (f) handleAudioFile(f); }} style={{ display: 'none' }} />
                                <div style={{ padding: '14px 16px', borderRadius: 12, border: `2px dashed ${audioFile ? '#FF5C2B' : 'rgba(255,255,255,0.08)'}`, background: audioFile ? 'rgba(255,92,43,0.05)' : '#1a1a1a', display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.2s' }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 10, background: audioFile ? 'rgba(255,92,43,0.15)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 20 }}>
                                        {audioFile ? '✅' : '🎙️'}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        {audioFile ? (
                                            <>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: '#FF5C2B' }}>{audioFile.name.length > 30 ? audioFile.name.slice(0, 30) + '…' : audioFile.name}</div>
                                                <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
                                                    <span style={{ color: audioFile.size <= MAX_AUDIO_MB * 1024 * 1024 ? '#4c4' : '#f66', fontWeight: 600 }}>
                                                        {(audioFile.size / 1024 / 1024).toFixed(2)}MB {audioFile.size <= MAX_AUDIO_MB * 1024 * 1024 ? '✅' : '❌ too large!'}
                                                    </span>
                                                    {audioDuration > 0 && (
                                                        <span style={{ marginLeft: 8, color: audioDuration <= 15 ? '#4c4' : '#f66', fontWeight: 600 }}>
                                                            · {audioDuration.toFixed(1)}s {audioDuration <= 15 ? '✅' : '❌ too long!'}
                                                        </span>
                                                    )}
                                                    <span style={{ marginLeft: 8, color: '#444' }}>— click to change</span>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>Click to upload audio</div>
                                                <div style={{ fontSize: 11, color: '#333', marginTop: 2 }}>Max 15s · max {MAX_AUDIO_MB}MB · the voice your avatar will speak</div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </label>
                        </div>

                        {/* Prompt */}
                        <div style={{ background: '#111', borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)', padding: '14px 20px' }}>
                            <div style={{ marginBottom: 10 }}>
                                <span style={{ fontSize: 12, color: '#555', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>✦ Style Prompt</span>
                                <span style={{ fontSize: 11, color: '#333', marginLeft: 8 }}>(optional)</span>
                            </div>
                            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={2}
                                style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', background: '#1a1a1a', color: 'white', fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6 }}
                                onFocus={e => e.target.style.borderColor = '#FF5C2B'}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.07)'}
                            />
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                                {PROMPT_EXAMPLES.map(ex => (
                                    <button key={ex} onClick={() => setPrompt(ex)}
                                        style={{ padding: '4px 10px', borderRadius: 100, border: '1px solid rgba(255,255,255,0.07)', background: 'transparent', color: '#444', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#FF5C2B'; e.currentTarget.style.color = '#FF5C2B'; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#444'; }}>
                                        {ex}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {error && (
                            <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: 14, padding: '12px 16px', color: '#ff6666', fontSize: 13, lineHeight: 1.6 }}>
                                ⚠️ {error}
                            </div>
                        )}

                        <button onClick={handleGenerate} disabled={!canGenerate}
                            style={{ width: '100%', padding: '18px', borderRadius: 16, border: 'none', background: canGenerate ? 'linear-gradient(135deg,#FF5C2B,#e04020)' : '#1a1a1a', color: canGenerate ? 'white' : '#333', fontSize: 16, fontWeight: 800, cursor: canGenerate ? 'pointer' : 'not-allowed', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: canGenerate ? '0 8px 30px rgba(255,92,43,0.3)' : 'none', transition: 'all 0.2s' }}>
                            {status === 'generating'
                                ? <><span style={{ width: 18, height: 18, border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />Generating avatar...</>
                                : '🎭 Generate Lip Sync Avatar'}
                        </button>

                        {status === 'generating' && (
                            <div style={{ background: '#111', borderRadius: 14, padding: '14px 18px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555', fontSize: 12, marginBottom: 8 }}>
                                    <span>Kling AI syncing lips to audio...</span>
                                    <span style={{ color: '#FF5C2B', fontWeight: 700 }}>{progress}%</span>
                                </div>
                                <div style={{ height: 6, background: '#1a1a1a', borderRadius: 100, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', background: 'linear-gradient(90deg,#FF5C2B,#e04020)', borderRadius: 100, width: `${progress}%`, transition: 'width 0.5s' }} />
                                </div>
                                <div style={{ fontSize: 11, color: '#333', marginTop: 8 }}>Usually takes 1–3 minutes</div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT — Output */}
                    <div style={{ position: 'sticky', top: 100 }}>
                        <div style={{ background: '#111', borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 12, color: '#555', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>Output</span>
                                {videoUrl && <span style={{ fontSize: 11, color: '#4c4', fontWeight: 600 }}>✅ Ready</span>}
                            </div>
                            <div style={{ background: '#0a0a0a', minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {videoUrl ? (
                                    <video src={videoUrl} controls autoPlay loop style={{ width: '100%', height: 'auto', display: 'block' }} />
                                ) : (
                                    <div style={{ textAlign: 'center', padding: 32 }}>
                                        {status === 'generating' ? (
                                            <>
                                                <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,92,43,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                                    <span style={{ width: 32, height: 32, border: '3px solid rgba(255,92,43,0.3)', borderTopColor: '#FF5C2B', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                                                </div>
                                                <div style={{ fontSize: 14, fontWeight: 600, color: '#555' }}>Creating your avatar...</div>
                                                <div style={{ fontSize: 12, color: '#333', marginTop: 4 }}>Kling AI is syncing lips to audio</div>
                                            </>
                                        ) : (
                                            <>
                                                <div style={{ fontSize: 56, marginBottom: 14 }}>🎭</div>
                                                <div style={{ fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 6 }}>Avatar video appears here</div>
                                                <div style={{ fontSize: 12, color: '#222' }}>Upload photo + audio then click Generate</div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                            {videoUrl && (
                                <div style={{ padding: 16 }}>
                                    <a href={videoUrl} download="lip-sync-avatar.mp4"
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '14px', borderRadius: 14, background: 'linear-gradient(135deg,#FF5C2B,#e04020)', color: 'white', textDecoration: 'none', fontSize: 14, fontWeight: 700, boxShadow: '0 6px 20px rgba(255,92,43,0.3)' }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" /></svg>
                                        Download Avatar Video
                                    </a>
                                    <button onClick={() => { setVideoUrl(''); setStatus('idle'); setProgress(0); }}
                                        style={{ width: '100%', marginTop: 8, padding: '10px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', background: 'transparent', color: '#444', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                                        Generate Another
                                    </button>
                                </div>
                            )}
                        </div>

                        {!videoUrl && (
                            <div style={{ marginTop: 16, background: '#0f0f0f', borderRadius: 16, border: '1px solid rgba(255,255,255,0.04)', padding: '16px 18px' }}>
                                <div style={{ fontSize: 11, color: '#333', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>💡 Tips for best results</div>
                                {[
                                    `Photo: clear front-facing · max ${MAX_IMAGE_MB}MB`,
                                    'Good lighting on the face works best',
                                    'Clean audio with no background noise',
                                    `Audio: max 15s · max ${MAX_AUDIO_MB}MB ⚠️`,
                                    'Compress images at tinypng.com',
                                    'Compress audio at mp3smaller.com',
                                    'Pro model gives more realistic sync',
                                ].map((tip, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 7, fontSize: 12, color: '#444' }}>
                                        <span style={{ color: '#FF5C2B', flexShrink: 0 }}>✦</span>{tip}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          div[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
        </div>
    );
}

export default function LipSyncPage() {
    return <AuthGuard><LipSyncContent /></AuthGuard>;
}