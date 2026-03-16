'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthGuard from '../components/AuthGuard';
import { createClient } from '../../lib/supabase';

function ImageToVideoContent() {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(5);
  const [status, setStatus] = useState<'idle' | 'generating' | 'done' | 'error'>('idle');
  const [videoUrl, setVideoUrl] = useState('');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [userId, setUserId] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u) { setUserId(u.id); setUserEmail(u.email || ''); }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setVideoUrl(''); setError('');
  };

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
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
      const res = await fetch('/api/image-to-video', { method: 'POST', body: fd });
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

  const PROMPT_EXAMPLES = [
    'Slow cinematic zoom in',
    'Gentle wind, hair flowing',
    'Camera pan left to right',
    'Subtle zoom with bokeh blur',
    'Dramatic sky movement',
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#080808', fontFamily: "var(--font-body,'DM Sans',system-ui,sans-serif)", color: 'white' }}>

      {/* Navbar */}
      <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 32px)', maxWidth: 1200, background: 'rgba(255,255,255,0.96)', borderRadius: 100, padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 9999, boxShadow: '0 4px 40px rgba(0,0,0,0.12)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 30, height: 30, background: '#080808', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "var(--font-heading,'Syne',system-ui,sans-serif)", fontWeight: 800, fontSize: 15, color: 'white' }}>H</div>
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
            <span>🎬</span>
            <span style={{ color: '#FF5C2B', fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Powered by Runway via kie.ai</span>
          </div>
          <h1 style={{ fontFamily: "var(--font-heading,'Syne',system-ui,sans-serif)", fontSize: 'clamp(36px,5vw,60px)', fontWeight: 800, letterSpacing: -2, marginBottom: 12, lineHeight: 1 }}>Image to Video</h1>
          <p style={{ color: '#555', fontSize: 16, maxWidth: 400, margin: '0 auto' }}>Upload any image and bring it to life with AI motion</p>
        </div>

        {/* Main grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

          {/* LEFT — Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Upload box */}
            <div style={{ background: '#111', borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: 12, color: '#555', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>Upload Image</span>
              </div>
              <div style={{ padding: 20 }}>
                <label
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  style={{ display: 'block', cursor: 'pointer' }}>
                  <input type="file" accept="image/*" onChange={handleImage} style={{ display: 'none' }} />
                  {preview ? (
                    <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: '#0a0a0a' }}
                      onMouseEnter={e => { const ov = e.currentTarget.querySelector('.hover-overlay') as HTMLElement; if (ov) ov.style.opacity = '1'; }}
                      onMouseLeave={e => { const ov = e.currentTarget.querySelector('.hover-overlay') as HTMLElement; if (ov) ov.style.opacity = '0'; }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={preview} alt="preview" style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 14 }} />
                      <div className="hover-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 14, opacity: 0, transition: 'opacity 0.2s' }}>
                        <span style={{ color: 'white', fontSize: 13, fontWeight: 600, background: 'rgba(0,0,0,0.5)', padding: '8px 16px', borderRadius: 100 }}>🖼️ Click to change</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ height: 380, borderRadius: 14, border: `2px dashed ${dragOver ? '#FF5C2B' : 'rgba(255,255,255,0.1)'}`, background: dragOver ? 'rgba(255,92,43,0.05)' : 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, transition: 'all 0.2s' }}>
                      <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(255,92,43,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF5C2B" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#888', marginBottom: 4 }}>Click or drag image here</div>
                        <div style={{ fontSize: 12, color: '#333' }}>JPG, PNG, WEBP — up to 10MB</div>
                      </div>
                      <div style={{ padding: '8px 18px', borderRadius: 100, background: '#FF5C2B', color: 'white', fontSize: 13, fontWeight: 700 }}>Browse Files</div>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Motion Prompt */}
            <div style={{ background: '#111', borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)', padding: '16px 20px' }}>
              <div style={{ marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: '#555', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>Motion Prompt</span>
                <span style={{ fontSize: 11, color: '#333', marginLeft: 8 }}>(optional)</span>
              </div>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3}
                placeholder="Describe how you want the image to move..."
                style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', background: '#1a1a1a', color: 'white', fontSize: 14, outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6 }}
                onFocus={e => (e.target.style.borderColor = '#FF5C2B')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.07)')}
              />
              {/* Quick prompt examples */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {PROMPT_EXAMPLES.map(ex => (
                  <button key={ex} onClick={() => setPrompt(ex)}
                    style={{ padding: '5px 12px', borderRadius: 100, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#444', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#FF5C2B'; e.currentTarget.style.color = '#FF5C2B'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#444'; }}>
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div style={{ background: '#111', borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)', padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: '#555', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>Duration</span>
                <span style={{ color: '#FF5C2B', fontWeight: 800, fontSize: 15 }}>{duration}s</span>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {[5, 10].map(d => (
                  <button key={d} onClick={() => setDuration(d)}
                    style={{ flex: 1, padding: '14px', borderRadius: 14, border: `2px solid ${duration === d ? '#FF5C2B' : 'rgba(255,255,255,0.07)'}`, background: duration === d ? 'rgba(255,92,43,0.12)' : '#1a1a1a', color: duration === d ? '#FF5C2B' : '#555', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}>
                    {d}s
                    <div style={{ fontSize: 10, fontWeight: 400, marginTop: 3, color: duration === d ? '#FF5C2B' : '#333' }}>
                      {d === 5 ? 'Standard' : 'Extended'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: 14, padding: '12px 16px', color: '#ff6666', fontSize: 13 }}>
                ⚠️ {error}
              </div>
            )}

            {/* Generate button */}
            <button onClick={handleGenerate} disabled={!image || status === 'generating'}
              style={{ width: '100%', padding: '18px', borderRadius: 16, border: 'none', background: (!image || status === 'generating') ? '#1a1a1a' : 'linear-gradient(135deg,#FF5C2B,#e04020)', color: (!image || status === 'generating') ? '#333' : 'white', fontSize: 16, fontWeight: 800, cursor: (!image || status === 'generating') ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all 0.2s', boxShadow: image && status !== 'generating' ? '0 8px 30px rgba(255,92,43,0.3)' : 'none' }}>
              {status === 'generating' ? (
                <><span style={{ width: 18, height: 18, border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> Generating video...</>
              ) : '✦ Generate Video'}
            </button>

            {/* Progress */}
            {status === 'generating' && (
              <div style={{ background: '#111', borderRadius: 14, padding: '14px 18px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555', fontSize: 12, marginBottom: 8 }}>
                  <span>Runway AI processing...</span>
                  <span style={{ color: '#FF5C2B', fontWeight: 700 }}>{progress}%</span>
                </div>
                <div style={{ height: 6, background: '#1a1a1a', borderRadius: 100, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'linear-gradient(90deg,#FF5C2B,#e04020)', borderRadius: 100, width: `${progress}%`, transition: 'width 0.5s' }} />
                </div>
                <div style={{ fontSize: 11, color: '#333', marginTop: 8 }}>This usually takes 1–2 minutes</div>
              </div>
            )}
          </div>

          {/* RIGHT — Video output */}
          <div style={{ position: 'sticky', top: 100 }}>
            <div style={{ background: '#111', borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#555', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>Output</span>
                {videoUrl && <span style={{ fontSize: 11, color: '#4c4', fontWeight: 600 }}>✅ Ready</span>}
              </div>

              {/* Video area */}
              <div style={{ background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', minHeight: 380 }}>
                {videoUrl ? (
                  <video src={videoUrl} controls autoPlay loop style={{ width: '100%', height: 'auto', maxHeight: '70vh', display: 'block', objectFit: 'contain' }} />
                ) : (
                  <div style={{ textAlign: 'center', padding: 20 }}>
                    {status === 'generating' ? (
                      <>
                        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,92,43,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                          <span style={{ width: 32, height: 32, border: '3px solid rgba(255,92,43,0.3)', borderTopColor: '#FF5C2B', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#555', marginBottom: 6 }}>AI is creating your video</div>
                        <div style={{ fontSize: 12, color: '#333' }}>Please wait a moment...</div>
                      </>
                    ) : (
                      <>
                        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
                            <polygon points="10,8 16,12 10,16" fill="rgba(255,255,255,0.15)" />
                          </svg>
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#333', marginBottom: 6 }}>Your video appears here</div>
                        <div style={{ fontSize: 12, color: '#222' }}>Upload an image and click Generate</div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Download button */}
              {videoUrl && (
                <div style={{ padding: 16 }}>
                  <a href={videoUrl} download="hmong-creative-video.mp4"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '14px', borderRadius: 14, background: 'linear-gradient(135deg,#FF5C2B,#e04020)', color: 'white', textDecoration: 'none', fontSize: 14, fontWeight: 700, boxShadow: '0 6px 20px rgba(255,92,43,0.3)' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" /></svg>
                    Download Video
                  </a>
                  <button onClick={() => { setVideoUrl(''); setStatus('idle'); setProgress(0); setPreview(''); setImage(null); }}
                    style={{ width: '100%', marginTop: 8, padding: '10px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', background: 'transparent', color: '#444', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Generate Another
                  </button>
                </div>
              )}
            </div>

            {/* Tips */}
            {!videoUrl && (
              <div style={{ marginTop: 16, background: '#0f0f0f', borderRadius: 16, border: '1px solid rgba(255,255,255,0.04)', padding: '16px 18px' }}>
                <div style={{ fontSize: 11, color: '#333', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>💡 Tips for best results</div>
                {['Use high-quality, well-lit images', 'Portraits and landscapes work best', 'Add a motion prompt for more control', 'Simple backgrounds generate cleaner motion'].map((tip, i) => (
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
          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function ImageToVideoPage() {
  return <AuthGuard><ImageToVideoContent /></AuthGuard>;
}