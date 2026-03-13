'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

type JobStatus = 'idle' | 'uploading' | 'generating' | 'done' | 'error';

export default function ImageToVideoPage() {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(5);
  const [status, setStatus] = useState<JobStatus>('idle');
  const [videoUrl, setVideoUrl] = useState('');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Please upload an image file'); return; }
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setError('');
    setVideoUrl('');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleGenerate = async () => {
    if (!image) { setError('Please upload an image first'); return; }
    setStatus('uploading'); setError(''); setProgress(10);

    const formData = new FormData();
    formData.append('image', image);
    formData.append('prompt', prompt);
    formData.append('duration', String(duration));

    try {
      setProgress(30); setStatus('generating');
      // Simulate progress while waiting
      const interval = setInterval(() => setProgress(p => Math.min(p + 5, 85)), 2000);

      const res = await fetch('/api/image-to-video', { method: 'POST', body: formData });
      clearInterval(interval);

      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Generation failed'); }
      const data = await res.json();
      setVideoUrl(data.videoUrl);
      setProgress(100); setStatus('done');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setStatus('error'); setProgress(0);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080808', fontFamily: "'DM Sans',sans-serif", color: 'white' }}>

      {/* Top Nav */}
      <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 48px)', maxWidth: 1200, background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(20px)', borderRadius: 100, padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 9999, boxShadow: '0 4px 40px rgba(0,0,0,0.15)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 32, height: 32, background: '#080808', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 16, color: 'white' }}>H</div>
          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, color: '#080808' }}>Hmong Creative</span>
        </Link>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/dashboard" style={{ padding: '9px 20px', borderRadius: 100, fontSize: 14, fontWeight: 500, color: '#333', textDecoration: 'none' }}>Dashboard</Link>
          <Link href="/login" style={{ background: '#080808', color: 'white', padding: '9px 20px', borderRadius: 100, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Sign In</Link>
        </div>
      </div>

      {/* Main */}
      <div style={{ paddingTop: 120, paddingBottom: 80, maxWidth: 900, margin: '0 auto', padding: '120px 24px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: 48, textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,92,43,0.1)', border: '1px solid rgba(255,92,43,0.3)', borderRadius: 100, padding: '6px 16px', marginBottom: 20 }}>
            <span style={{ fontSize: 16 }}>🎬</span>
            <span style={{ color: '#FF5C2B', fontSize: 13, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Powered by fal.ai • Kling AI</span>
          </div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(36px,5vw,60px)', fontWeight: 800, letterSpacing: -2, lineHeight: 1, marginBottom: 16 }}>
            Image to Video
          </h1>
          <p style={{ color: '#666', fontSize: 16, maxWidth: 480, margin: '0 auto' }}>
            Upload any image and watch it come alive with AI-powered motion
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

          {/* LEFT — Upload */}
          <div>
            {/* Drop Zone */}
            <div
              onClick={() => fileRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              style={{
                border: `2px dashed ${preview ? '#FF5C2B' : 'rgba(255,255,255,0.12)'}`,
                borderRadius: 20, overflow: 'hidden',
                aspectRatio: '16/9', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', position: 'relative',
                background: preview ? 'transparent' : '#0f0f0f',
                transition: 'border-color 0.2s',
                marginBottom: 20,
              }}
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🖼️</div>
                  <p style={{ color: '#555', fontSize: 14, fontWeight: 600 }}>Drop image here</p>
                  <p style={{ color: '#333', fontSize: 12, marginTop: 4 }}>or click to browse</p>
                  <p style={{ color: '#222', fontSize: 11, marginTop: 8 }}>PNG, JPG, WEBP up to 10MB</p>
                </>
              )}
              {preview && (
                <button
                  onClick={e => { e.stopPropagation(); setImage(null); setPreview(''); setVideoUrl(''); }}
                  style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.7)', border: 'none', color: 'white', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', fontSize: 14 }}
                >✕</button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

            {/* Prompt */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', color: '#888', fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Motion Prompt (optional)</label>
              <textarea
                value={prompt} onChange={e => setPrompt(e.target.value)}
                placeholder="e.g. camera slowly zooms in, gentle wind blowing, cinematic..."
                rows={3}
                style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: '#111', color: 'white', fontSize: 14, outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                onFocus={e => (e.target.style.borderColor = '#FF5C2B')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </div>

            {/* Duration */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', color: '#888', fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
                <span>Duration</span>
                <span style={{ color: '#FF5C2B', fontWeight: 700 }}>{duration}s</span>
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[5, 8, 10].map(d => (
                  <button key={d} onClick={() => setDuration(d)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${duration === d ? '#FF5C2B' : 'rgba(255,255,255,0.1)'}`, background: duration === d ? 'rgba(255,92,43,0.12)' : 'transparent', color: duration === d ? '#FF5C2B' : '#555', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{d}s</button>
                ))}
              </div>
            </div>

            {error && <p style={{ color: '#ff4444', fontSize: 13, marginBottom: 16, background: 'rgba(255,68,68,0.1)', padding: '10px 14px', borderRadius: 8 }}>{error}</p>}

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={status === 'uploading' || status === 'generating' || !image}
              style={{ width: '100%', padding: '16px', borderRadius: 14, border: 'none', background: (!image || status === 'generating' || status === 'uploading') ? '#222' : '#FF5C2B', color: (!image || status === 'generating' || status === 'uploading') ? '#444' : 'white', fontSize: 16, fontWeight: 700, cursor: (!image || status === 'generating' || status === 'uploading') ? 'not-allowed' : 'pointer' }}
            >
              {status === 'uploading' ? '⏳ Uploading...' : status === 'generating' ? '🎬 Generating...' : '✦ Generate Video'}
            </button>

            {/* Progress */}
            {(status === 'uploading' || status === 'generating') && (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555', fontSize: 12, marginBottom: 8 }}>
                  <span>{status === 'uploading' ? 'Uploading image...' : 'Runway ML generating...'}</span>
                  <span>{progress}%</span>
                </div>
                <div style={{ height: 4, background: '#1a1a1a', borderRadius: 100 }}>
                  <div style={{ height: '100%', background: '#FF5C2B', borderRadius: 100, width: `${progress}%`, transition: 'width 0.5s ease' }} />
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — Output */}
          <div>
            <div style={{ borderRadius: 20, overflow: 'hidden', aspectRatio: '16/9', background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              {videoUrl ? (
                <video src={videoUrl} controls autoPlay loop style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ textAlign: 'center', color: '#333' }}>
                  {status === 'generating' ? (
                    <>
                      <div style={{ fontSize: 40, marginBottom: 12, animation: 'spin 2s linear infinite' }}>⚙️</div>
                      <p style={{ fontSize: 14 }}>AI is working its magic...</p>
                      <p style={{ fontSize: 12, marginTop: 6, color: '#222' }}>This may take 30–90 seconds</p>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>🎬</div>
                      <p style={{ fontSize: 14 }}>Your video will appear here</p>
                    </>
                  )}
                </div>
              )}
            </div>

            {videoUrl && (
              <a href={videoUrl} download="hmong-creative-video.mp4" style={{ display: 'block', textAlign: 'center', padding: '14px', borderRadius: 14, border: '1.5px solid #FF5C2B', color: '#FF5C2B', textDecoration: 'none', fontSize: 15, fontWeight: 700 }}>
                ⬇ Download Video
              </a>
            )}

            {/* Tips */}
            <div style={{ marginTop: 24, background: '#0f0f0f', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.05)' }}>
              <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 14, color: '#888', letterSpacing: 1, textTransform: 'uppercase' }}>💡 Tips for best results</p>
              {['Use high resolution images (1024px+)', 'Describe motion clearly in the prompt', 'Simple backgrounds work best', 'Portrait & landscape both work'].map(tip => (
                <div key={tip} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                  <span style={{ color: '#FF5C2B', fontSize: 12, marginTop: 2 }}>✦</span>
                  <span style={{ color: '#555', fontSize: 13, lineHeight: 1.5 }}>{tip}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}