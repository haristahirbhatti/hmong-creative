'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthGuard from '../components/AuthGuard';
import { createClient } from '../../lib/supabase';

const RATIOS = ['1:1','16:9','9:16','4:3','3:4'];
const STYLES = ['Photorealistic','Digital Art','Anime','Oil Painting','Watercolor','Cinematic','Minimalist','3D Render'];

function CreateImageContent() {
  const [prompt, setPrompt]     = useState('');
  const [ratio, setRatio]       = useState('1:1');
  const [style, setStyle]       = useState('Photorealistic');
  const [status, setStatus]     = useState<'idle'|'generating'|'done'|'error'>('idle');
  const [imageUrl, setImageUrl] = useState('');
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

  const handleGenerate = async () => {
    if (!prompt) { setError('Please enter a prompt'); return; }
    setStatus('generating'); setError(''); setProgress(15); setImageUrl('');
    const interval = setInterval(() => setProgress(p => Math.min(p + 6, 85)), 1500);
    try {
      const res  = await fetch('/api/create-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, aspect_ratio: ratio, style, userId, userEmail }) });
      clearInterval(interval);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setImageUrl(data.imageUrl);
      setProgress(100); setStatus('done');
    } catch (e: unknown) {
      clearInterval(interval);
      setError(e instanceof Error ? e.message : 'Failed');
      setStatus('error'); setProgress(0);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080808', fontFamily: "'DM Sans',sans-serif", color: 'white' }}>
      <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 32px)', maxWidth: 1200, background: 'rgba(255,255,255,0.96)', borderRadius: 100, padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 9999, boxShadow: '0 4px 40px rgba(0,0,0,0.12)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 30, height: 30, background: '#080808', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, color: 'white' }}>H</div>
          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, color: '#080808' }}>Hmong Creative</span>
        </Link>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => router.back()} style={{ padding: '8px 16px', borderRadius: 100, border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', color: '#555', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
          <Link href="/dashboard" style={{ background: '#080808', color: 'white', padding: '8px 18px', borderRadius: 100, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Dashboard</Link>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '100px 20px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,92,43,0.1)', border: '1px solid rgba(255,92,43,0.3)', borderRadius: 100, padding: '6px 16px', marginBottom: 18 }}>
            <span>🖼️</span>
            <span style={{ color: '#FF5C2B', fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Powered by FLUX Kontext via kie.ai</span>
          </div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(32px,5vw,56px)', fontWeight: 800, letterSpacing: -2, marginBottom: 10 }}>Create Image</h1>
          <p style={{ color: '#555', fontSize: 15 }}>Turn your words into stunning visuals</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
          {/* Controls */}
          <div style={{ background: '#111', borderRadius: 20, padding: 24, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', color: '#666', fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Describe your image</label>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4}
                placeholder="e.g. A Hmong woman in traditional clothing, misty mountains, cinematic..."
                style={{ width: '100%', padding: '13px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: '#1a1a1a', color: 'white', fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6 }}
                onFocus={e => (e.target.style.borderColor = '#FF5C2B')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', color: '#666', fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Style</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {STYLES.map(s => (
                  <button key={s} onClick={() => setStyle(s)}
                    style={{ padding: '6px 12px', borderRadius: 100, border: `1px solid ${style === s ? '#FF5C2B' : 'rgba(255,255,255,0.08)'}`, background: style === s ? 'rgba(255,92,43,0.12)' : 'transparent', color: style === s ? '#FF5C2B' : '#555', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{s}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', color: '#666', fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Aspect Ratio</label>
              <div style={{ display: 'flex', gap: 7 }}>
                {RATIOS.map(r => (
                  <button key={r} onClick={() => setRatio(r)}
                    style={{ flex: 1, padding: '8px 4px', borderRadius: 10, border: `1px solid ${ratio === r ? '#FF5C2B' : 'rgba(255,255,255,0.08)'}`, background: ratio === r ? 'rgba(255,92,43,0.12)' : 'transparent', color: ratio === r ? '#FF5C2B' : '#555', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{r}</button>
                ))}
              </div>
            </div>

            {error && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, color: '#ff6666', fontSize: 13 }}>⚠️ {error}</div>}

            <button onClick={handleGenerate} disabled={!prompt || status === 'generating'}
              style={{ width: '100%', padding: '15px', borderRadius: 14, border: 'none', background: (!prompt || status === 'generating') ? '#1a1a1a' : '#FF5C2B', color: (!prompt || status === 'generating') ? '#333' : 'white', fontSize: 15, fontWeight: 700, cursor: (!prompt || status === 'generating') ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {status === 'generating' ? '✨ Generating...' : '✦ Generate Image'}
            </button>

            {status === 'generating' && (
              <div style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#444', fontSize: 12, marginBottom: 6 }}>
                  <span>FLUX generating...</span><span>{progress}%</span>
                </div>
                <div style={{ height: 4, background: '#1a1a1a', borderRadius: 100 }}>
                  <div style={{ height: '100%', background: '#FF5C2B', borderRadius: 100, width: `${progress}%`, transition: 'width 0.5s' }} />
                </div>
              </div>
            )}
          </div>

          {/* Output */}
          <div>
            <div style={{ borderRadius: 16, overflow: 'hidden', aspectRatio: '1/1', background: '#111', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="Generated" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ textAlign: 'center', color: '#2a2a2a' }}>
                  {status === 'generating' ? <><div style={{ fontSize: 36, marginBottom: 10 }}>✨</div><p style={{ fontSize: 13 }}>AI painting...</p></> : <><div style={{ fontSize: 36, marginBottom: 10 }}>🖼️</div><p style={{ fontSize: 13 }}>Image will appear here</p></>}
                </div>
              )}
            </div>
            {imageUrl && (
              <a href={imageUrl} download="hmong-creative-image.png"
                style={{ display: 'block', textAlign: 'center', padding: '13px', borderRadius: 14, border: '1.5px solid #FF5C2B', color: '#FF5C2B', textDecoration: 'none', fontSize: 14, fontWeight: 700 }}>
                ⬇ Download Image
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CreateImagePage() {
  return <AuthGuard><CreateImageContent /></AuthGuard>;
}
