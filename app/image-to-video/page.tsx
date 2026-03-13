'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthGuard from '../components/AuthGuard';
import { createClient } from '../../lib/supabase';

function ImageToVideoContent() {
  const [image, setImage]       = useState<File | null>(null);
  const [preview, setPreview]   = useState('');
  const [prompt, setPrompt]     = useState('');
  const [duration, setDuration] = useState(5);
  const [status, setStatus]     = useState<'idle'|'generating'|'done'|'error'>('idle');
  const [videoUrl, setVideoUrl] = useState('');
  const [error, setError]       = useState('');
  const [progress, setProgress] = useState(0);
  const [userId, setUserId]     = useState('');
  const [userEmail, setUserEmail] = useState('');
  const router   = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { setUserId(user.id); setUserEmail(user.email || ''); }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file); setPreview(URL.createObjectURL(file));
    setVideoUrl(''); setError('');
  };

  const handleGenerate = async () => {
    if (!image) { setError('Please upload an image'); return; }
    setStatus('generating'); setError(''); setProgress(10);
    const interval = setInterval(() => setProgress(p => Math.min(p + 1, 85)), 3000);
    try {
      const fd = new FormData();
      fd.append('image', image);
      fd.append('prompt', prompt);
      fd.append('duration', String(duration));
      fd.append('userId', userId);
      fd.append('userEmail', userEmail);

      const res  = await fetch('/api/image-to-video', { method: 'POST', body: fd });
      clearInterval(interval);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setVideoUrl(data.videoUrl);
      setProgress(100); setStatus('done');
    } catch (e: unknown) {
      clearInterval(interval);
      setError(e instanceof Error ? e.message : 'Failed');
      setStatus('error'); setProgress(0);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080808', fontFamily: "var(--font-body, 'DM Sans', system-ui, sans-serif)", color: 'white' }}>
      {/* Navbar */}
      <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 32px)', maxWidth: 1200, background: 'rgba(255,255,255,0.96)', borderRadius: 100, padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 9999, boxShadow: '0 4px 40px rgba(0,0,0,0.12)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 30, height: 30, background: '#080808', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "var(--font-heading, 'Syne', system-ui, sans-serif)", fontWeight: 800, fontSize: 15, color: 'white' }}>H</div>
          <span style={{ fontFamily: "var(--font-heading, 'Syne', system-ui, sans-serif)", fontWeight: 800, fontSize: 15, color: '#080808' }}>Hmong Creative</span>
        </Link>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => router.back()} style={{ padding: '8px 16px', borderRadius: 100, border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', color: '#555', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
          <Link href="/dashboard" style={{ background: '#080808', color: 'white', padding: '8px 18px', borderRadius: 100, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Dashboard</Link>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '100px 20px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,92,43,0.1)', border: '1px solid rgba(255,92,43,0.3)', borderRadius: 100, padding: '6px 16px', marginBottom: 18 }}>
            <span>🎬</span>
            <span style={{ color: '#FF5C2B', fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Powered by Runway via kie.ai</span>
          </div>
          <h1 style={{ fontFamily: "var(--font-heading, 'Syne', system-ui, sans-serif)", fontSize: 'clamp(32px,5vw,56px)', fontWeight: 800, letterSpacing: -2, marginBottom: 10 }}>Image to Video</h1>
          <p style={{ color: '#555', fontSize: 15 }}>Upload an image and bring it to life with AI</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
          <div style={{ background: '#111', borderRadius: 20, padding: 24, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', color: '#666', fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Upload Image</label>
              <label style={{ display: 'block', cursor: 'pointer' }}>
                <input type="file" accept="image/*" onChange={handleImage} style={{ display: 'none' }} />
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="preview" style={{ width: '100%', borderRadius: 12, maxHeight: 200, objectFit: 'cover' }} />
                ) : (
                  <div style={{ height: 140, borderRadius: 12, border: '2px dashed rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#333' }}>
                    <span style={{ fontSize: 28 }}>📷</span>
                    <span style={{ fontSize: 13 }}>Click to upload image</span>
                    <span style={{ fontSize: 11, color: '#222' }}>JPG, PNG, WEBP</span>
                  </div>
                )}
              </label>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', color: '#666', fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Motion Prompt <span style={{ color: '#333' }}>(optional)</span></label>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3}
                placeholder="e.g. Slow zoom in, gentle breeze, cinematic..."
                style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: '#1a1a1a', color: 'white', fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6 }}
                onFocus={e => (e.target.style.borderColor = '#FF5C2B')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', color: '#666', fontSize: 13, fontWeight: 500, marginBottom: 10 }}>
                <span>Duration</span><span style={{ color: '#FF5C2B', fontWeight: 700 }}>{duration}s</span>
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[5, 10].map(d => (
                  <button key={d} onClick={() => setDuration(d)}
                    style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${duration === d ? '#FF5C2B' : 'rgba(255,255,255,0.08)'}`, background: duration === d ? 'rgba(255,92,43,0.12)' : 'transparent', color: duration === d ? '#FF5C2B' : '#555', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{d}s</button>
                ))}
              </div>
            </div>

            {error && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, color: '#ff6666', fontSize: 13 }}>⚠️ {error}</div>}

            <button onClick={handleGenerate} disabled={!image || status === 'generating'}
              style={{ width: '100%', padding: '15px', borderRadius: 14, border: 'none', background: (!image || status === 'generating') ? '#1a1a1a' : '#FF5C2B', color: (!image || status === 'generating') ? '#333' : 'white', fontSize: 15, fontWeight: 700, cursor: (!image || status === 'generating') ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {status === 'generating' ? '🎬 Generating...' : '✦ Generate Video'}
            </button>

            {status === 'generating' && (
              <div style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#444', fontSize: 12, marginBottom: 6 }}>
                  <span>Runway processing...</span><span>{progress}%</span>
                </div>
                <div style={{ height: 4, background: '#1a1a1a', borderRadius: 100 }}>
                  <div style={{ height: '100%', background: '#FF5C2B', borderRadius: 100, width: `${progress}%`, transition: 'width 0.5s' }} />
                </div>
              </div>
            )}
          </div>

          <div>
            <div style={{ borderRadius: 16, overflow: 'hidden', background: '#111', border: '1px solid rgba(255,255,255,0.06)', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              {videoUrl ? (
                <video src={videoUrl} controls autoPlay loop style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ textAlign: 'center', color: '#2a2a2a' }}>
                  {status === 'generating' ? <><div style={{ fontSize: 36, marginBottom: 10 }}>🎬</div><p style={{ fontSize: 13 }}>Generating...</p></> : <><div style={{ fontSize: 36, marginBottom: 10 }}>▶️</div><p style={{ fontSize: 13 }}>Video will appear here</p></>}
                </div>
              )}
            </div>
            {videoUrl && (
              <a href={videoUrl} download="hmong-creative-video.mp4"
                style={{ display: 'block', textAlign: 'center', padding: '13px', borderRadius: 14, border: '1.5px solid #FF5C2B', color: '#FF5C2B', textDecoration: 'none', fontSize: 14, fontWeight: 700 }}>
                ⬇ Download Video
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ImageToVideoPage() {
  return <AuthGuard><ImageToVideoContent /></AuthGuard>;
}
