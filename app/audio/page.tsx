'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthGuard from '../components/AuthGuard';
import { createClient } from '../../lib/supabase';

const TAGS = {
  Culture: ['Hmong vocals', 'Hmong folk', 'Southeast Asian', 'Traditional', 'Modern Hmong'],
  Mood: ['sad', 'emotional', 'romantic', 'upbeat', 'melancholic', 'happy', 'dark', 'peaceful'],
  Genre: ['pop', 'R&B', 'hip hop', 'acoustic', 'lo-fi', 'jazz', 'classical', 'folk', 'traditional', 'indie', 'electronic', 'ballad'],
  Voice: ['male vocals', 'female vocals', 'soft vocals', 'powerful vocals'],
  Tempo: ['slow', 'medium tempo', 'fast'],
};

function AudioContent() {
  const [title, setTitle] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [selectedTags, setTags] = useState<string[]>([]);
  const [instrumental, setInstrumental] = useState(false);
  const [status, setStatus] = useState<'idle' | 'generating' | 'done' | 'error'>('idle');
  const [audioUrl, setAudioUrl] = useState('');
  const [audioTitle, setAudioTitle] = useState('');
  const [error, setError] = useState('');
  const [userId, setUserId] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('User');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }: { data: { user: { id: string; email?: string; user_metadata?: Record<string, string> } | null } }) => {
      if (u) {
        setUserId(u.id);
        setUserEmail(u.email || '');
        setUserName(u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'User');
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTag = (tag: string) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const styleString = selectedTags.join(' · ') || 'No style selected';

  const handleGenerate = async () => {
    if (!title) { setError('Please enter a song title'); return; }
    if (!instrumental && !lyrics) { setError('Please enter lyrics or enable instrumental mode'); return; }
    setStatus('generating'); setError('');

    // Build style string from ALL selected tags
    const genreStyle = selectedTags.filter(t => TAGS.Genre.includes(t)).join(', ');
    const voiceStyle = selectedTags.filter(t => TAGS.Voice.includes(t)).join(', ');
    const tempoStyle = selectedTags.filter(t => TAGS.Tempo.includes(t)).join(', ');
    const moodStyle = selectedTags.filter(t => TAGS.Mood.includes(t)).join(', ');
    const cultureStyle = selectedTags.filter(t => TAGS.Culture.includes(t)).join(', ');
    const fullStyle = [cultureStyle, genreStyle, voiceStyle, tempoStyle, moodStyle].filter(Boolean).join(', ') || 'pop';

    // Prompt is just the title or description — lyrics go separately
    const prompt = title || 'Hmong Song';

    try {
      const res = await fetch('/api/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          lyrics: instrumental ? '' : lyrics,
          style: fullStyle,
          instrumental,
          userId,
          userEmail,
          title,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAudioUrl(data.audioUrl);
      setAudioTitle(title);
      setStatus('done');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Generation failed');
      setStatus('error');
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) { audioRef.current.pause(); } else { audioRef.current.play(); }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

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
          <span style={{ fontSize: 13, fontWeight: 600, color: 'white', display: 'none' }} className="sm-show">{userName}</span>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, marginTop: 56 }}>

        {/* Left sidebar — nav */}
        <aside style={{ width: 200, background: '#0a0a0a', borderRight: '1px solid rgba(255,255,255,0.05)', padding: '24px 12px', position: 'fixed', top: 56, bottom: audioUrl ? 80 : 0, display: 'flex', flexDirection: 'column', gap: 4, zIndex: 100 }}>
          {[
            { icon: '🏠', label: 'Home', href: '/' },
            { icon: '🎵', label: 'Create', href: '/audio', active: true },
            { icon: '📚', label: 'Library', href: '/dashboard' },
            { icon: '◀', label: 'Back', href: '/dashboard' },
          ].map(item => (
            <Link key={item.label} href={item.href}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, textDecoration: 'none', background: item.active ? 'rgba(255,92,43,0.12)' : 'transparent', color: item.active ? '#FF5C2B' : '#555', fontSize: 14, fontWeight: item.active ? 700 : 500, transition: 'all 0.15s' }}
              onMouseEnter={e => { if (!item.active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={e => { if (!item.active) e.currentTarget.style.background = 'transparent'; }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>{item.label}
            </Link>
          ))}

          <div style={{ marginTop: 'auto', background: 'rgba(255,92,43,0.08)', border: '1px solid rgba(255,92,43,0.2)', borderRadius: 12, padding: '14px 12px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#FF5C2B', marginBottom: 4 }}>⚡ Credits</div>
            <div style={{ fontSize: 11, color: '#666', lineHeight: 1.5 }}>Powered by Suno V4</div>
          </div>
        </aside>

        {/* Main content */}
        <main style={{ marginLeft: 200, flex: 1, padding: '24px 28px', paddingBottom: audioUrl ? 100 : 40, minWidth: 0, maxWidth: 780 }}>

          {/* Song title */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#555', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Song Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Hmong Song Test 1"
              style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: '#141414', color: 'white', fontSize: 16, fontWeight: 500, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              onFocus={e => e.target.style.borderColor = '#FF5C2B'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
          </div>

          {/* Lyrics */}
          {!instrumental && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 12, color: '#555', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>Lyrics</label>
                <span style={{ fontSize: 11, color: '#FF5C2B', background: 'rgba(255,92,43,0.1)', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>AI will sing exactly these words</span>
              </div>
              <textarea value={lyrics} onChange={e => setLyrics(e.target.value)} rows={7}
                placeholder={'Khaws wb cov lus\nLos txog hnub no\nPhem los zoo\nKuv yeej tsis tso\n\nKoj lub siab twb\nNrog lwm tus'}
                style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: '#141414', color: 'white', fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.8 }}
                onFocus={e => e.target.style.borderColor = '#FF5C2B'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
            </div>
          )}

          {/* Description (style tags via optional field) */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#555', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Song Description <span style={{ color: '#333', textTransform: 'none', fontSize: 11, fontWeight: 400 }}>(optional)</span></label>
            <input placeholder="e.g. Pop, cinematic, emotional..."
              style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: '#141414', color: 'white', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              onFocus={e => e.target.style.borderColor = '#FF5C2B'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
          </div>

          {/* Instrumental toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: '#141414', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 24 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 16 }}>🎙️</span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>Instrumental Mode</span>
              </div>
              <div style={{ fontSize: 12, color: '#444', paddingLeft: 24 }}>Toggle to remove all vocals</div>
            </div>
            <button onClick={() => setInstrumental(!instrumental)}
              style={{ width: 48, height: 26, borderRadius: 100, border: 'none', background: instrumental ? '#FF5C2B' : '#2a2a2a', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'white', position: 'absolute', top: 4, left: instrumental ? 26 : 4, transition: 'left 0.2s' }} />
            </button>
          </div>

          {/* Style tags */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: 14 }}>🎨</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#555', letterSpacing: 0.5, textTransform: 'uppercase' }}>Style &amp; Inspiration</span>
              <span style={{ fontSize: 11, color: '#333' }}>These guide the AI generation</span>
            </div>

            {Object.entries(TAGS).map(([section, tags]) => (
              <div key={section} style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <span style={{ fontSize: 13 }}>
                    {section === 'Culture' ? '🏔️' : section === 'Mood' ? '💭' : section === 'Genre' ? '🎸' : section === 'Voice' ? '🎤' : '⏱️'}
                  </span>
                  <span style={{ fontSize: 12, color: '#444', fontWeight: 600 }}>{section}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {tags.map(tag => {
                    const active = selectedTags.includes(tag);
                    return (
                      <button key={tag} onClick={() => toggleTag(tag)}
                        style={{ padding: '7px 14px', borderRadius: 100, border: `1px solid ${active ? '#FF5C2B' : 'rgba(255,255,255,0.1)'}`, background: active ? 'rgba(255,92,43,0.15)' : 'transparent', color: active ? '#FF5C2B' : '#777', fontSize: 13, fontWeight: active ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                        {active && '✓ '}{tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Will generate preview */}
          {(title || selectedTags.length > 0) && (
            <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 18px', marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#444', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>WILL GENERATE:</div>
              {title && <div style={{ fontSize: 13, color: '#888', marginBottom: 6 }}>📄 <strong style={{ color: 'white' }}>Title:</strong> {title}</div>}
              <div style={{ fontSize: 13, color: '#888', marginBottom: 6 }}>
                {instrumental ? '🎵 Instrumental only' : '🎤 With your exact lyrics'}
              </div>
              {selectedTags.length > 0 && (
                <div style={{ fontSize: 13, color: '#888' }}>
                  ✨ <strong style={{ color: 'white' }}>Style:</strong>{' '}
                  <span style={{ color: '#FF5C2B' }}>{styleString}</span>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.25)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, color: '#ff6666', fontSize: 13, lineHeight: 1.5 }}>
              ⚠️ {error}
            </div>
          )}

          {/* Generate button */}
          <button onClick={status === 'generating' ? undefined : handleGenerate} disabled={status === 'generating'}
            style={{ width: '100%', padding: '16px', borderRadius: 14, border: 'none', background: status === 'generating' ? 'linear-gradient(90deg,#c44,#a33)' : 'linear-gradient(90deg,#FF5C2B,#e04020)', color: 'white', fontSize: 15, fontWeight: 700, cursor: status === 'generating' ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'opacity 0.2s' }}>
            {status === 'generating' ? (
              <>
                <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                Generating...
              </>
            ) : (
              <>✦ Create Song</>
            )}
          </button>
        </main>
      </div>

      {/* Bottom player — shows after generation */}
      {audioUrl && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#111', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '0 20px', display: 'flex', alignItems: 'center', gap: 16, zIndex: 9999, height: 80 }}>

          {/* Album art */}
          <div style={{ width: 46, height: 46, background: 'linear-gradient(135deg,#FF5C2B,#a020a0)', borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M9 18V5l12-2v13M9 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm12-2c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z" /></svg>
          </div>

          {/* Title */}
          <div style={{ minWidth: 0, width: 140, flexShrink: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{audioTitle || 'My Song'}</div>
            <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Unknown</div>
          </div>

          {/* Center: play button + progress */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 0 }}>
            {/* Play/Pause button */}
            <button onClick={togglePlay}
              style={{ width: 36, height: 36, borderRadius: '50%', background: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {isPlaying
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="#080808"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="#080808"><polygon points="5,3 19,12 5,21" /></svg>
              }
            </button>
            {/* Progress bar */}
            <div style={{ width: '100%', maxWidth: 520, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, color: '#555', flexShrink: 0, minWidth: 28, textAlign: 'right' }}>{formatTime(currentTime)}</span>
              <div style={{ flex: 1, height: 4, background: '#2a2a2a', borderRadius: 100, cursor: 'pointer', position: 'relative' }}
                onClick={e => {
                  if (!audioRef.current) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
                }}>
                <div style={{ height: '100%', background: '#FF5C2B', borderRadius: 100, width: duration ? `${(currentTime / duration) * 100}%` : '0%', transition: 'width 0.1s' }} />
              </div>
              <span style={{ fontSize: 10, color: '#555', flexShrink: 0, minWidth: 28 }}>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Volume */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#555"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" /></svg>
            <input type="range" min="0" max="1" step="0.05" defaultValue="1"
              onChange={e => { if (audioRef.current) audioRef.current.volume = parseFloat(e.target.value); }}
              style={{ width: 70, accentColor: '#FF5C2B', cursor: 'pointer' }}
            />
          </div>

          {/* Save */}
          <a href={audioUrl} download="hmong-creative.mp3"
            style={{ flexShrink: 0, padding: '8px 16px', borderRadius: 20, border: '1px solid rgba(255,92,43,0.4)', color: '#FF5C2B', textDecoration: 'none', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#FF5C2B"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" /></svg>
            Save
          </a>

          <audio ref={audioRef} src={audioUrl}
            onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
            onLoadedMetadata={() => { setDuration(audioRef.current?.duration || 0); audioRef.current?.play(); setIsPlaying(true); }}
            onEnded={() => setIsPlaying(false)}
          />
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          aside { display: none !important; }
          main  { margin-left: 0 !important; padding: 16px !important; }
        }
      `}</style>
    </div>
  );
}

export default function AudioPage() {
  return <AuthGuard><AudioContent /></AuthGuard>;
}