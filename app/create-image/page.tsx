'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthGuard from '../components/AuthGuard';
import { createClient } from '../../lib/supabase';

const TAG_SECTIONS = {
  Style: ['Photorealistic', 'Digital Art', 'Anime', 'Oil Painting', 'Watercolor', 'Cinematic', 'Minimalist', '3D Render', 'Sketch', 'Comic'],
  Mood: ['dramatic', 'peaceful', 'mysterious', 'joyful', 'dark', 'vibrant', 'dreamy', 'epic'],
  Lighting: ['golden hour', 'studio light', 'neon light', 'natural light', 'sunset', 'moonlight', 'soft light'],
  Camera: ['portrait', 'wide angle', 'macro', 'aerial view', 'close-up', 'bokeh'],
};

const EXAMPLES = [
  "A Hmong woman in traditional silver jewelry and embroidered dress, standing in misty mountain valleys at golden hour",
  "A young Hmong man playing a qeej instrument, surrounded by colorful festival lanterns at night, cinematic lighting",
  "Traditional Hmong village on a green hillside, morning fog, ultra realistic landscape photography",
  "A Hmong elder woman weaving colorful fabric with intricate patterns, close-up, warm studio lighting",
  "Futuristic Hmong warrior woman in traditional-inspired armor, neon lights, cyberpunk city background",
  "Hmong New Year celebration, crowd in vibrant traditional clothes, aerial view, golden hour photography",
];

const RATIOS = [
  { label: '1:1', icon: '⬛', desc: 'Square' },
  { label: '16:9', icon: '▬', desc: 'Landscape' },
  { label: '9:16', icon: '▮', desc: 'Portrait' },
  { label: '4:3', icon: '▭', desc: 'Standard' },
  { label: '3:4', icon: '▯', desc: 'Tall' },
];

function CreateImageContent() {
  const [prompt, setPrompt] = useState('');
  const [ratio, setRatio] = useState('1:1');
  const [selectedTags, setTags] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'generating' | 'done' | 'error'>('idle');
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [userId, setUserId] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('User');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u) {
        setUserId(u.id);
        setUserEmail(u.email || '');
        setUserName((u.user_metadata?.full_name as string) || (u.user_metadata?.name as string) || u.email?.split('@')[0] || 'User');
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTag = (tag: string) => setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  const handleGenerate = async () => {
    if (!prompt) { setError('Please describe your image'); return; }
    setStatus('generating'); setError(''); setProgress(15); setImageUrl('');
    const interval = setInterval(() => setProgress(p => Math.min(p + 5, 88)), 1800);
    try {
      // Build rich prompt: base prompt + all style/mood/lighting/camera tags
      const tagString = selectedTags.join(', ');
      const fullPrompt = tagString ? `${prompt}, ${tagString}` : prompt;
      const styleString = selectedTags.filter(t => TAG_SECTIONS.Style.includes(t)).join(', ');

      const res = await fetch('/api/create-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: fullPrompt,
          aspect_ratio: ratio,
          style: styleString || '',
          userId,
          userEmail,
        }),
      });
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
    <div style={{ minHeight: '100vh', background: '#0a0a0a', fontFamily: "var(--font-body,'DM Sans',system-ui,sans-serif)", color: 'white', display: 'flex', flexDirection: 'column' }}>

      {/* Top nav */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 56, background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', zIndex: 9999 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 28, height: 28, background: '#FF5C2B', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "var(--font-heading,'Syne',system-ui,sans-serif)", fontWeight: 800, fontSize: 14, color: 'white' }}>H</div>
          <span style={{ fontFamily: "var(--font-heading,'Syne',system-ui,sans-serif)", fontWeight: 800, fontSize: 14, color: 'white' }}>Hmong Creative</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#FF5C2B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>{userName[0]?.toUpperCase()}</div>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, marginTop: 56 }}>

        {/* Left sidebar */}
        <aside style={{ width: 200, background: '#0a0a0a', borderRight: '1px solid rgba(255,255,255,0.05)', padding: '24px 12px', position: 'fixed', top: 56, bottom: 0, display: 'flex', flexDirection: 'column', gap: 4, zIndex: 100 }}>
          {[
            { icon: '🏠', label: 'Home', href: '/' },
            { icon: '🖼️', label: 'Create', href: '/create-image', active: true },
            { icon: '📚', label: 'Library', href: '/dashboard' },
            { icon: '◀', label: 'Back', href: '/dashboard' },
          ].map(item => (
            <Link key={item.label} href={item.href}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, textDecoration: 'none', background: item.active ? 'rgba(255,92,43,0.12)' : 'transparent', color: item.active ? '#FF5C2B' : '#555', fontSize: 14, fontWeight: item.active ? 700 : 500 }}
              onMouseEnter={e => { if (!item.active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={e => { if (!item.active) e.currentTarget.style.background = 'transparent'; }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>{item.label}
            </Link>
          ))}

          <div style={{ marginTop: 'auto', background: 'rgba(255,92,43,0.08)', border: '1px solid rgba(255,92,43,0.2)', borderRadius: 12, padding: '14px 12px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#FF5C2B', marginBottom: 4 }}>⚡ FLUX Pro</div>
            <div style={{ fontSize: 11, color: '#666', lineHeight: 1.5 }}>Powered by FLUX Kontext</div>
          </div>
        </aside>

        {/* Main — split layout on desktop */}
        <main style={{ marginLeft: 200, flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, minWidth: 0, maxHeight: 'calc(100vh - 56px)', overflow: 'hidden' }}>

          {/* Left panel — controls */}
          <div style={{ borderRight: '1px solid rgba(255,255,255,0.05)', overflowY: 'auto', padding: '24px 24px' }}>

            {/* Prompt */}
            <div style={{ marginBottom: 22 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#555', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Describe your image</label>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4}
                placeholder={'e.g. A Hmong woman in traditional dress, misty mountains, golden hour, photorealistic...'}
                style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: '#141414', color: 'white', fontSize: 14, outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.7 }}
                onFocus={e => e.target.style.borderColor = '#FF5C2B'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
              {/* Example prompts */}
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, color: '#333', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>✦ Try an example:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {EXAMPLES.map((ex, i) => (
                    <button key={i} onClick={() => setPrompt(ex)}
                      style={{ textAlign: 'left', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', background: 'transparent', color: '#555', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1.4, transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#FF5C2B'; e.currentTarget.style.color = '#aaa'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#555'; }}>
                      {ex.length > 80 ? ex.slice(0, 80) + '...' : ex}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Aspect ratio */}
            <div style={{ marginBottom: 22 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#555', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>Aspect Ratio</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {RATIOS.map(r => (
                  <button key={r.label} onClick={() => setRatio(r.label)} title={r.desc}
                    style={{ flex: 1, padding: '10px 6px', borderRadius: 10, border: `1px solid ${ratio === r.label ? '#FF5C2B' : 'rgba(255,255,255,0.07)'}`, background: ratio === r.label ? 'rgba(255,92,43,0.12)' : '#141414', color: ratio === r.label ? '#FF5C2B' : '#555', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center' }}>
                    <div style={{ fontSize: 14, marginBottom: 3 }}>{r.icon}</div>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Style tags */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: 14 }}>🎨</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#555', letterSpacing: 0.5, textTransform: 'uppercase' }}>Style Tags</span>
                <span style={{ fontSize: 11, color: '#333' }}>Click to apply</span>
              </div>

              {Object.entries(TAG_SECTIONS).map(([section, tags]) => (
                <div key={section} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: 13 }}>
                      {section === 'Style' ? '🖼️' : section === 'Mood' ? '💭' : section === 'Lighting' ? '💡' : '📷'}
                    </span>
                    <span style={{ fontSize: 12, color: '#444', fontWeight: 600 }}>{section}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {tags.map(tag => {
                      const active = selectedTags.includes(tag);
                      return (
                        <button key={tag} onClick={() => toggleTag(tag)}
                          style={{ padding: '6px 12px', borderRadius: 100, border: `1px solid ${active ? '#FF5C2B' : 'rgba(255,255,255,0.08)'}`, background: active ? 'rgba(255,92,43,0.15)' : 'transparent', color: active ? '#FF5C2B' : '#666', fontSize: 12, fontWeight: active ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                          {active && '✓ '}{tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Preview summary */}
            {(prompt || selectedTags.length > 0) && (
              <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 16px', marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#444', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>WILL GENERATE:</div>
                {prompt && <div style={{ fontSize: 12, color: '#666', marginBottom: 5 }}>📝 <span style={{ color: '#aaa' }}>{prompt.slice(0, 60)}{prompt.length > 60 ? '...' : ''}</span></div>}
                <div style={{ fontSize: 12, color: '#666', marginBottom: 5 }}>📐 Ratio: <span style={{ color: '#FF5C2B', fontWeight: 700 }}>{ratio}</span></div>
                {selectedTags.length > 0 && <div style={{ fontSize: 12, color: '#666' }}>✨ Tags: <span style={{ color: '#FF5C2B' }}>{selectedTags.join(' · ')}</span></div>}
              </div>
            )}

            {error && (
              <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.25)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, color: '#ff6666', fontSize: 13 }}>
                ⚠️ {error}
              </div>
            )}

            <button onClick={status === 'generating' ? undefined : handleGenerate} disabled={status === 'generating'}
              style={{ width: '100%', padding: '15px', borderRadius: 14, border: 'none', background: status === 'generating' ? '#1a1a1a' : 'linear-gradient(90deg,#FF5C2B,#e04020)', color: status === 'generating' ? '#444' : 'white', fontSize: 15, fontWeight: 700, cursor: status === 'generating' ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              {status === 'generating' ? (
                <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#888', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />Generating...</>
              ) : '✦ Generate Image'}
            </button>
          </div>

          {/* Right panel — output */}
          <div style={{ overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: imageUrl ? 'flex-start' : 'center', background: '#080808' }}>
            {imageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="Generated"
                  style={{ width: '100%', maxWidth: 480, borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', marginBottom: 16 }}
                />
                <a href={imageUrl} download="hmong-creative-image.jpg"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', maxWidth: 480, padding: '13px', borderRadius: 14, border: '1.5px solid #FF5C2B', color: '#FF5C2B', textDecoration: 'none', fontSize: 14, fontWeight: 700 }}>
                  ⬇ Download Image
                </a>
                <button onClick={() => { setImageUrl(''); setStatus('idle'); setProgress(0); }}
                  style={{ marginTop: 10, width: '100%', maxWidth: 480, padding: '11px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', background: 'transparent', color: '#444', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Generate Another
                </button>
              </>
            ) : (
              <div style={{ textAlign: 'center', maxWidth: 300 }}>
                {status === 'generating' ? (
                  <>
                    <div style={{ width: 80, height: 80, borderRadius: 20, background: 'rgba(255,92,43,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 20px' }}>✨</div>
                    <div style={{ fontFamily: "var(--font-heading,'Syne',system-ui,sans-serif)", fontWeight: 800, fontSize: 18, marginBottom: 8 }}>Creating your image</div>
                    <div style={{ color: '#444', fontSize: 13, marginBottom: 20 }}>FLUX Kontext is painting...</div>
                    <div style={{ height: 4, background: '#1a1a1a', borderRadius: 100, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: 'linear-gradient(90deg,#FF5C2B,#e04020)', borderRadius: 100, width: `${progress}%`, transition: 'width 0.5s' }} />
                    </div>
                    <div style={{ color: '#333', fontSize: 12, marginTop: 8 }}>{progress}%</div>
                  </>
                ) : (
                  <>
                    <div style={{ width: 80, height: 80, borderRadius: 20, background: '#141414', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 20px' }}>🖼️</div>
                    <div style={{ fontFamily: "var(--font-heading,'Syne',system-ui,sans-serif)", fontWeight: 800, fontSize: 18, marginBottom: 8, color: '#333' }}>Your image appears here</div>
                    <div style={{ color: '#2a2a2a', fontSize: 13 }}>Describe your vision on the left and click Generate</div>
                  </>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          aside { display: none !important; }
          main  { 
            margin-left: 0 !important; 
            grid-template-columns: 1fr !important;
            max-height: none !important;
            overflow: visible !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function CreateImagePage() {
  return <AuthGuard><CreateImageContent /></AuthGuard>;
}