'use client';

import { useState } from 'react';
import Link from 'next/link';

const RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4'];
const STYLES = ['Photorealistic', 'Digital Art', 'Anime', 'Oil Painting', 'Watercolor', 'Cinematic', 'Minimalist', '3D Render'];

export default function CreateImagePage() {
  const [prompt, setPrompt] = useState('');
  const [ratio, setRatio] = useState('1:1');
  const [style, setStyle] = useState('Photorealistic');
  const [status, setStatus] = useState<'idle' | 'generating' | 'done' | 'error'>('idle');
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);

  const handleGenerate = async () => {
    if (!prompt) { setError('Please enter a prompt'); return; }
    setStatus('generating'); setError(''); setProgress(15); setImageUrl('');

    const interval = setInterval(() => setProgress(p => Math.min(p + 8, 85)), 1500);

    try {
      const res = await fetch('/api/create-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, aspect_ratio: ratio, style: style.toLowerCase() }),
      });
      clearInterval(interval);
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      const data = await res.json();
      setImageUrl(data.imageUrl);
      setProgress(100); setStatus('done');
    } catch (e: unknown) {
      clearInterval(interval);
      setError(e instanceof Error ? e.message : 'Failed'); setStatus('error'); setProgress(0);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080808', fontFamily: "'DM Sans',sans-serif", color: 'white' }}>

      {/* Navbar */}
      <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 48px)', maxWidth: 1200, background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(20px)', borderRadius: 100, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 9999, boxShadow: '0 4px 40px rgba(0,0,0,0.15)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 32, height: 32, background: '#080808', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 16, color: 'white' }}>H</div>
          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, color: '#080808' }}>Hmong Creative</span>
        </Link>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/dashboard" style={{ padding: '9px 20px', borderRadius: 100, fontSize: 14, color: '#555', textDecoration: 'none' }}>Dashboard</Link>
          <Link href="/login" style={{ background: '#080808', color: 'white', padding: '9px 20px', borderRadius: 100, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Sign In</Link>
        </div>
      </div>

      <div style={{ paddingTop: 120, maxWidth: 960, margin: '0 auto', padding: '120px 24px 80px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,92,43,0.1)', border: '1px solid rgba(255,92,43,0.3)', borderRadius: 100, padding: '6px 16px', marginBottom: 20 }}>
            <span>🖼️</span>
            <span style={{ color: '#FF5C2B', fontSize: 13, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Powered by FLUX Kontext via kie.ai</span>
          </div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(36px,5vw,60px)', fontWeight: 800, letterSpacing: -2, marginBottom: 12 }}>Create Image</h1>
          <p style={{ color: '#555', fontSize: 16 }}>Turn your words into stunning visuals with AI</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

          {/* LEFT — Controls */}
          <div>
            <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, padding: 28 }}>

              {/* Prompt */}
              <div style={{ marginBottom: 22 }}>
                <label style={{ display: 'block', color: '#888', fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Describe your image</label>
                <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4}
                  placeholder="e.g. A Hmong woman in traditional clothing standing in a misty mountain landscape, cinematic lighting, ultra realistic..."
                  style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: '#1a1a1a', color: 'white', fontSize: 14, outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6 }}
                  onFocus={e => (e.target.style.borderColor = '#FF5C2B')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                />
              </div>

              {/* Style */}
              <div style={{ marginBottom: 22 }}>
                <label style={{ display: 'block', color: '#888', fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Style</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {STYLES.map(s => (
                    <button key={s} onClick={() => setStyle(s)} style={{ padding: '7px 13px', borderRadius: 100, border: `1px solid ${style === s ? '#FF5C2B' : 'rgba(255,255,255,0.08)'}`, background: style === s ? 'rgba(255,92,43,0.12)' : 'transparent', color: style === s ? '#FF5C2B' : '#555', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{s}</button>
                  ))}
                </div>
              </div>

              {/* Aspect Ratio */}
              <div style={{ marginBottom: 28 }}>
                <label style={{ display: 'block', color: '#888', fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Aspect Ratio</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {RATIOS.map(r => (
                    <button key={r} onClick={() => setRatio(r)} style={{ flex: 1, padding: '9px 4px', borderRadius: 10, border: `1px solid ${ratio === r ? '#FF5C2B' : 'rgba(255,255,255,0.08)'}`, background: ratio === r ? 'rgba(255,92,43,0.12)' : 'transparent', color: ratio === r ? '#FF5C2B' : '#555', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{r}</button>
                  ))}
                </div>
              </div>

              {error && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, color: '#ff6666', fontSize: 13 }}>⚠️ {error}</div>}

              <button onClick={handleGenerate} disabled={status === 'generating' || !prompt}
                style={{ width: '100%', padding: '16px', borderRadius: 14, border: 'none', background: (!prompt || status === 'generating') ? '#1a1a1a' : '#FF5C2B', color: (!prompt || status === 'generating') ? '#333' : 'white', fontSize: 16, fontWeight: 700, cursor: (!prompt || status === 'generating') ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {status === 'generating' ? '✨ Generating...' : '✦ Generate Image'}
              </button>

              {status === 'generating' && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#444', fontSize: 12, marginBottom: 8 }}>
                    <span>FLUX Kontext generating...</span><span>{progress}%</span>
                  </div>
                  <div style={{ height: 4, background: '#1a1a1a', borderRadius: 100 }}>
                    <div style={{ height: '100%', background: '#FF5C2B', borderRadius: 100, width: `${progress}%`, transition: 'width 0.5s' }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — Output */}
          <div>
            <div style={{ borderRadius: 20, overflow: 'hidden', aspectRatio: '1/1', background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="Generated" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ textAlign: 'center', color: '#2a2a2a' }}>
                  {status === 'generating' ? (
                    <><div style={{ fontSize: 40, marginBottom: 12 }}>✨</div><p style={{ fontSize: 14 }}>AI is painting...</p></>
                  ) : (
                    <><div style={{ fontSize: 40, marginBottom: 12 }}>🖼️</div><p style={{ fontSize: 14 }}>Your image will appear here</p></>
                  )}
                </div>
              )}
            </div>
            {imageUrl && (
              <a href={imageUrl} download="hmong-creative-image.png" style={{ display: 'block', textAlign: 'center', padding: '14px', borderRadius: 14, border: '1.5px solid #FF5C2B', color: '#FF5C2B', textDecoration: 'none', fontSize: 15, fontWeight: 700 }}>⬇ Download Image</a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}