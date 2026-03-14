'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import AuthGuard from '../components/AuthGuard';
import { createClient } from '../../lib/supabase';

const TAGS = {
  Culture: ['Hmong vocals', 'Hmong folk', 'Southeast Asian', 'Traditional', 'Modern Hmong'],
  Mood: ['sad', 'emotional', 'romantic', 'upbeat', 'melancholic', 'happy', 'dark', 'peaceful'],
  Genre: ['pop', 'R&B', 'hip hop', 'acoustic', 'lo-fi', 'jazz', 'classical', 'folk', 'traditional', 'indie', 'electronic', 'ballad'],
  Voice: ['male vocals', 'female vocals', 'soft vocals', 'powerful vocals'],
  Tempo: ['slow', 'medium tempo', 'fast'],
};

// A snapshot of the inputs that produced a generated clip
type GeneratedClip = {
  audioUrl: string;
  title: string;
  lyrics: string;
  selectedTags: string[];
  instrumental: boolean;
  taskId?: string;   // from KIE generation — needed for music-video & timestamped lyrics
  audioId?: string;  // per-clip ID
};

type VocalSep = { vocalUrl: string; instrumentalUrl: string; taskId: string };
type TimestampWord = { word: string; startTime: number; endTime: number };

// Per-song inline player component
function SongCard({
  clip,
  index,
  onEdit,
  onRegenerate,
}: {
  clip: GeneratedClip;
  index: number;
  onEdit: (clip: GeneratedClip) => void;
  onRegenerate: (clip: GeneratedClip) => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Feature states
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [featLoading, setFeatLoading] = useState(false);
  const [featError, setFeatError] = useState('');
  const [genLyrics, setGenLyrics] = useState('');
  const [tsWords, setTsWords] = useState<TimestampWord[]>([]);
  const [coverUrl, setCoverUrl] = useState('');
  const [vocalSep, setVocalSep] = useState<VocalSep | null>(null);
  const [midiUrl, setMidiUrl] = useState('');
  const [musicVideoUrl, setMusicVideoUrl] = useState('');

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) { audioRef.current.pause(); } else { audioRef.current.play(); }
    setIsPlaying(!isPlaying);
  };

  const accentColor = index === 0 ? '#FF5C2B' : '#a020a0';
  const styleString = clip.selectedTags.join(' · ') || 'No style';

  const toggleFeature = (id: string) => {
    setActiveFeature(prev => prev === id ? null : id);
    setFeatError('');
  };

  const runFeature = async (id: string) => {
    setFeatLoading(true); setFeatError('');
    try {
      if (id === 'gen-lyrics') {
        const r = await fetch('/api/lyrics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: `${clip.title} — ${clip.selectedTags.join(', ') || 'pop'} song` }) });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setGenLyrics(d.lyrics || '');
      } else if (id === 'timestamps') {
        const r = await fetch('/api/timestamped-lyrics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId: clip.taskId, audioId: clip.audioId }) });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setTsWords(d.words || []);
      } else if (id === 'cover') {
        const prompt = `Album cover art for a ${clip.selectedTags.join(', ') || 'pop'} song titled "${clip.title}", digital art, vibrant`;
        const r = await fetch('/api/create-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, aspect_ratio: '1:1' }) });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setCoverUrl(d.imageUrl || '');
      } else if (id === 'vocals') {
        const r = await fetch('/api/vocal-separation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audioUrl: clip.audioUrl }) });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setVocalSep({ vocalUrl: d.vocalUrl, instrumentalUrl: d.instrumentalUrl, taskId: d.taskId });
      } else if (id === 'midi') {
        if (!vocalSep) { setFeatError('Run "Split Vocals" first, then generate MIDI'); setFeatLoading(false); return; }
        const r = await fetch('/api/midi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId: vocalSep.taskId }) });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setMidiUrl(d.midiUrl || '');
      } else if (id === 'video') {
        const r = await fetch('/api/music-video', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId: clip.taskId, audioId: clip.audioId }) });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setMusicVideoUrl(d.videoUrl || '');
      }
    } catch (e: unknown) {
      setFeatError(e instanceof Error ? e.message : 'Failed');
    }
    setFeatLoading(false);
  };

  const FEATURES = [
    { id: 'gen-lyrics', icon: '✍️', label: 'Lyrics' },
    { id: 'timestamps', icon: '⏱️', label: 'Karaoke' },
    { id: 'cover', icon: '🖼️', label: 'Cover Art' },
    { id: 'vocals', icon: '🎙️', label: 'Split' },
    { id: 'midi', icon: '🎹', label: 'MIDI' },
    { id: 'video', icon: '🎬', label: 'Video' },
  ];

  // Current highlighted word for karaoke
  const activeWord = tsWords.find(w => currentTime >= w.startTime && currentTime <= w.endTime);

  return (
    <div style={{
      background: '#141414', borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)',
      padding: '16px', marginBottom: 12, flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9,
          background: index === 0
            ? 'linear-gradient(135deg,#FF5C2B,#e04020)'
            : 'linear-gradient(135deg,#a020a0,#6010b0)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
            <path d="M9 18V5l12-2v13M9 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm12-2c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {clip.title || 'My Song'} {index === 0 ? '(v1)' : '(v2)'}
          </div>
          <div style={{ fontSize: 11, color: '#444', marginTop: 1 }}>
            {clip.instrumental ? 'Instrumental' : 'With lyrics'}
          </div>
        </div>
      </div>

      {/* Player */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <button onClick={togglePlay} style={{
            width: 30, height: 30, borderRadius: '50%', background: 'white',
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {isPlaying
              ? <svg width="10" height="10" viewBox="0 0 24 24" fill="#080808"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
              : <svg width="10" height="10" viewBox="0 0 24 24" fill="#080808"><polygon points="5,3 19,12 5,21" /></svg>
            }
          </button>
          <div
            style={{ flex: 1, height: 3, background: '#2a2a2a', borderRadius: 100, cursor: 'pointer', position: 'relative' }}
            onClick={e => {
              if (!audioRef.current) return;
              const rect = e.currentTarget.getBoundingClientRect();
              audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
            }}
          >
            <div style={{ height: '100%', background: index === 0 ? '#FF5C2B' : '#a020a0', borderRadius: 100, width: duration ? `${(currentTime / duration) * 100}%` : '0%', transition: 'width 0.1s' }} />
          </div>
          <span style={{ fontSize: 10, color: '#444', flexShrink: 0, minWidth: 28 }}>{formatTime(currentTime)}</span>
        </div>
      </div>

      {/* Used Inputs */}
      <div style={{ background: '#1a1a1a', borderRadius: 12, padding: '10px 14px', marginBottom: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: 10, color: accentColor, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Used Inputs</div>
        {clip.selectedTags.length > 0 && <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>🎨 <span style={{ color: '#aaa' }}>{styleString}</span></div>}
        {!clip.instrumental && clip.lyrics && <div style={{ fontSize: 11, color: '#777', whiteSpace: 'pre-line', maxHeight: 44, overflow: 'hidden' }}>📄 {clip.lyrics.slice(0, 80)}{clip.lyrics.length > 80 ? '…' : ''}</div>}
        {clip.instrumental && <div style={{ fontSize: 11, color: '#555' }}>🎙️ Instrumental only</div>}
      </div>

      {/* Edit / Regenerate / Download row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <button onClick={() => onEdit(clip)} style={{ flex: 1, padding: '8px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#888', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'white'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#888'; }}>✏️ Edit</button>
        <button onClick={() => onRegenerate(clip)} style={{ flex: 1, padding: '8px', borderRadius: 10, border: `1px solid ${accentColor}66`, background: `${accentColor}18`, color: accentColor, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}>🔄 Regenerate</button>
        <a href={clip.audioUrl} download={`${clip.title || 'song'}.mp3`} style={{ display: 'flex', alignItems: 'center', padding: '8px 10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', color: '#555', textDecoration: 'none' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" /></svg>
        </a>
      </div>

      {/* ── AI Feature Toolbar ── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 10, marginBottom: featLoading || activeFeature ? 10 : 0 }}>
        <div style={{ fontSize: 10, color: '#333', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>AI Tools</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {FEATURES.map(f => (
            <button key={f.id}
              onClick={() => { toggleFeature(f.id); if (activeFeature !== f.id) runFeature(f.id); }}
              style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${activeFeature === f.id ? accentColor : 'rgba(255,255,255,0.08)'}`, background: activeFeature === f.id ? `${accentColor}20` : 'transparent', color: activeFeature === f.id ? accentColor : '#555', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
              {f.icon} {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feature Loading */}
      {featLoading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', color: '#555', fontSize: 12 }}>
          <span style={{ width: 14, height: 14, border: '2px solid #333', borderTopColor: accentColor, borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
          Processing…
        </div>
      )}

      {/* Feature Error */}
      {featError && <div style={{ fontSize: 12, color: '#f66', padding: '8px 10px', background: 'rgba(255,80,80,0.07)', borderRadius: 8, marginTop: 8 }}>⚠️ {featError}</div>}

      {/* ── Feature Results ── */}
      {!featLoading && activeFeature && (
        <div style={{ marginTop: 10, background: '#111', borderRadius: 12, padding: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>

          {/* Generate Lyrics result */}
          {activeFeature === 'gen-lyrics' && genLyrics && (
            <div>
              <div style={{ fontSize: 10, color: accentColor, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Generated Lyrics</div>
              <pre style={{ fontSize: 12, color: '#aaa', whiteSpace: 'pre-wrap', lineHeight: 1.8, margin: 0, fontFamily: 'inherit' }}>{genLyrics}</pre>
              <button onClick={() => navigator.clipboard.writeText(genLyrics)} style={{ marginTop: 8, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#888', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>📋 Copy Lyrics</button>
            </div>
          )}

          {/* Karaoke / Timestamped Lyrics */}
          {activeFeature === 'timestamps' && (
            <div>
              <div style={{ fontSize: 10, color: accentColor, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Karaoke Sync</div>
              {tsWords.length > 0 ? (
                <div style={{ fontSize: 13, lineHeight: 2, color: '#555' }}>
                  {tsWords.map((w, i) => (
                    <span key={i} style={{ color: w === activeWord ? accentColor : currentTime > w.endTime ? '#888' : '#444', fontWeight: w === activeWord ? 700 : 400, transition: 'color 0.1s' }}>{w.word} </span>
                  ))}
                </div>
              ) : <div style={{ fontSize: 12, color: '#444' }}>No timestamp data returned. Song may not have lyrics sync available.</div>}
            </div>
          )}

          {/* Cover Art */}
          {activeFeature === 'cover' && coverUrl && (
            <div>
              <div style={{ fontSize: 10, color: accentColor, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Cover Art</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverUrl} alt="Album cover" style={{ width: '100%', borderRadius: 10, display: 'block' }} />
              <a href={coverUrl} download="cover.jpg" style={{ display: 'block', marginTop: 8, textAlign: 'center', padding: '6px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', color: '#888', textDecoration: 'none', fontSize: 12 }}>⬇ Download Cover</a>
            </div>
          )}

          {/* Split Vocals */}
          {activeFeature === 'vocals' && vocalSep && (
            <div>
              <div style={{ fontSize: 10, color: accentColor, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Separated Tracks</div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>🎤 Vocals</div>
                <audio controls src={vocalSep.vocalUrl} style={{ width: '100%', height: 32 }} />
                <a href={vocalSep.vocalUrl} download="vocals.mp3" style={{ fontSize: 11, color: '#555', textDecoration: 'none' }}>⬇ Download Vocals</a>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>🎸 Instrumental</div>
                <audio controls src={vocalSep.instrumentalUrl} style={{ width: '100%', height: 32 }} />
                <a href={vocalSep.instrumentalUrl} download="instrumental.mp3" style={{ fontSize: 11, color: '#555', textDecoration: 'none' }}>⬇ Download Instrumental</a>
              </div>
              <div style={{ marginTop: 10, lineHeight: 1.5, fontSize: 11, color: '#444' }}>✅ Vocal separation done. Click <strong style={{ color: accentColor }}>MIDI</strong> above to generate MIDI.</div>
            </div>
          )}

          {/* MIDI */}
          {activeFeature === 'midi' && midiUrl && (
            <div>
              <div style={{ fontSize: 10, color: accentColor, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>MIDI File</div>
              <a href={midiUrl} download={`${clip.title || 'song'}.mid`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px', borderRadius: 10, background: `${accentColor}15`, border: `1px solid ${accentColor}40`, color: accentColor, textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>🎹 Download MIDI File</a>
            </div>
          )}

          {/* Music Video */}
          {activeFeature === 'video' && musicVideoUrl && (
            <div>
              <div style={{ fontSize: 10, color: accentColor, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Music Video</div>
              <video controls src={musicVideoUrl} style={{ width: '100%', borderRadius: 10 }} />
              <a href={musicVideoUrl} download={`${clip.title || 'video'}.mp4`} style={{ display: 'block', marginTop: 8, textAlign: 'center', padding: '6px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', color: '#888', textDecoration: 'none', fontSize: 12 }}>⬇ Download Video</a>
            </div>
          )}

        </div>
      )}

      <audio
        ref={audioRef}
        src={clip.audioUrl}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => {
          setDuration(audioRef.current?.duration || 0);
          if (index === 0) { audioRef.current?.play(); setIsPlaying(true); }
        }}
        onEnded={() => setIsPlaying(false)}
      />
    </div>
  );
}

function AudioContent() {
  const [title, setTitle] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [selectedTags, setTags] = useState<string[]>([]);
  const [instrumental, setInstrumental] = useState(false);
  const [status, setStatus] = useState<'idle' | 'generating' | 'done' | 'error'>('idle');
  const [clips, setClips] = useState<GeneratedClip[]>([]);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('User');
  // Upload & Cover Audio feature
  const [showCoverUpload, setShowCoverUpload] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverStyle, setCoverStyle] = useState('');
  const [coverLoading, setCoverLoading] = useState(false);
  const [coverResult, setCoverResult] = useState('');
  const [coverErr, setCoverErr] = useState('');
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

  // Core generation logic — accepts explicit args OR falls back to current state
  const handleGenerateWithArgs = async (args?: {
    title: string; lyrics: string; selectedTags: string[]; instrumental: boolean;
  }) => {
    const t = args?.title ?? title;
    const l = args?.lyrics ?? lyrics;
    const tags = args?.selectedTags ?? selectedTags;
    const instr = args?.instrumental ?? instrumental;

    if (!t) { setError('Please enter a song title'); return; }
    if (!instr && !l) { setError('Please enter lyrics or enable instrumental mode'); return; }
    setStatus('generating'); setError('');

    const genreStyle = tags.filter(tag => TAGS.Genre.includes(tag)).join(', ');
    const voiceStyle = tags.filter(tag => TAGS.Voice.includes(tag)).join(', ');
    const tempoStyle = tags.filter(tag => TAGS.Tempo.includes(tag)).join(', ');
    const moodStyle = tags.filter(tag => TAGS.Mood.includes(tag)).join(', ');
    const cultureStyle = tags.filter(tag => TAGS.Culture.includes(tag)).join(', ');
    const fullStyle = [cultureStyle, genreStyle, voiceStyle, tempoStyle, moodStyle].filter(Boolean).join(', ') || 'pop';

    const prompt = t || 'Hmong Song';

    try {
      const res = await fetch('/api/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          lyrics: instr ? '' : l,
          style: fullStyle,
          instrumental: instr,
          userId,
          userEmail,
          title: t,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Snapshot of inputs used for this generation
      const inputSnapshot = { title: t, lyrics: l, selectedTags: [...tags], instrumental: instr, taskId: data.taskId || '' };

      // Build clip list from the API response — up to 2 songs
      const rawClips: { audioUrl?: string; audio_url?: string; url?: string; audioId?: string; id?: string }[] = data.clips || [];
      const builtClips: GeneratedClip[] = rawClips.slice(0, 2).map(c => ({
        ...inputSnapshot,
        audioUrl: c.audioUrl || c.audio_url || c.url || '',
        audioId: c.audioId || c.id || '',
      })).filter(c => c.audioUrl);

      // If clips array is empty/not returned, fallback to single audioUrl
      if (builtClips.length === 0 && data.audioUrl) {
        builtClips.push({ ...inputSnapshot, audioUrl: data.audioUrl, audioId: '' });
      }

      setClips(builtClips);
      setStatus('done');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Generation failed');
      setStatus('error');
    }
  };

  // Button handler — uses current form state
  const handleGenerate = () => handleGenerateWithArgs();

  // Edit: load inputs back into the form and scroll to the top of the form
  const handleEditClip = (clip: GeneratedClip) => {
    setTitle(clip.title);
    setLyrics(clip.lyrics);
    setTags([...clip.selectedTags]);
    setInstrumental(clip.instrumental);
    // Scroll the main area to top so user can see the loaded inputs
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Regenerate: load inputs then immediately trigger generation
  const handleRegenerateClip = async (clip: GeneratedClip) => {
    setTitle(clip.title);
    setLyrics(clip.lyrics);
    setTags([...clip.selectedTags]);
    setInstrumental(clip.instrumental);
    // Small delay so state updates flush before generate reads them
    setTimeout(() => {
      handleGenerateWithArgs({
        title: clip.title,
        lyrics: clip.lyrics,
        selectedTags: clip.selectedTags,
        instrumental: clip.instrumental,
      });
    }, 50);
  };

  const hasSongs = clips.length > 0;

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
        <aside style={{ width: 200, background: '#0a0a0a', borderRight: '1px solid rgba(255,255,255,0.05)', padding: '24px 12px', position: 'fixed', top: 56, bottom: 0, display: 'flex', flexDirection: 'column', gap: 4, zIndex: 100 }}>
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

        {/* Main content — form */}
        <main style={{
          marginLeft: 200,
          // Shrink main area when the songs panel is visible
          marginRight: hasSongs ? 400 : 0,
          flex: 1, padding: '24px 28px 40px', minWidth: 0, maxWidth: 780,
          transition: 'margin-right 0.3s ease',
        }}>

          {/* Song title */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#555', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Song Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Hmong Song Test 1"
              style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: '#141414', color: 'white', fontSize: 16, fontWeight: 500, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              onFocus={e => e.target.style.borderColor = '#FF5C2B'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
          </div>

          {/* ── Upload & Cover Audio ── */}
          <div style={{ marginBottom: 20, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' }}>
            <button onClick={() => setShowCoverUpload(v => !v)}
              style={{ width: '100%', padding: '14px 16px', background: '#141414', border: 'none', color: '#888', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'inherit', textAlign: 'left' }}>
              <span style={{ fontSize: 16 }}>🔁</span>
              Upload &amp; Cover Audio
              <span style={{ marginLeft: 'auto', fontSize: 10, color: '#444' }}>{showCoverUpload ? '▲' : '▼'}</span>
            </button>
            {showCoverUpload && (
              <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', background: '#0f0f0f' }}>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, color: '#555', fontWeight: 600, display: 'block', marginBottom: 6 }}>Upload Audio File (MP3 / WAV)</label>
                  <input type="file" accept="audio/*" onChange={e => setCoverFile(e.target.files?.[0] || null)}
                    style={{ fontSize: 12, color: '#888', width: '100%' }} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, color: '#555', fontWeight: 600, display: 'block', marginBottom: 6 }}>Style <span style={{ color: '#333', fontWeight: 400 }}>(optional)</span></label>
                  <input value={coverStyle} onChange={e => setCoverStyle(e.target.value)} placeholder="e.g. Hmong folk, pop, R&B..."
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: '#141414', color: 'white', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                </div>
                {coverErr && <div style={{ fontSize: 12, color: '#f66', marginBottom: 10 }}>⚠️ {coverErr}</div>}
                {coverResult && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: '#FF5C2B', fontWeight: 700, marginBottom: 6 }}>✅ Cover Generated</div>
                    <audio controls src={coverResult} style={{ width: '100%' }} />
                    <a href={coverResult} download="cover.mp3" style={{ fontSize: 11, color: '#555', textDecoration: 'none' }}>⬇ Download Cover</a>
                  </div>
                )}
                <button
                  disabled={!coverFile || coverLoading}
                  onClick={async () => {
                    if (!coverFile) return;
                    setCoverLoading(true); setCoverErr(''); setCoverResult('');
                    try {
                      const fd = new FormData();
                      fd.append('audio', coverFile);
                      fd.append('style', coverStyle || 'pop');
                      const r = await fetch('/api/cover-audio', { method: 'POST', body: fd });
                      const d = await r.json();
                      if (!r.ok) throw new Error(d.error);
                      setCoverResult(d.audioUrl || '');
                    } catch (e: unknown) { setCoverErr(e instanceof Error ? e.message : 'Failed'); }
                    setCoverLoading(false);
                  }}
                  style={{ width: '100%', padding: '10px', borderRadius: 10, border: 'none', background: !coverFile || coverLoading ? '#1a1a1a' : '#FF5C2B', color: !coverFile || coverLoading ? '#444' : 'white', fontSize: 13, fontWeight: 700, cursor: !coverFile || coverLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {coverLoading ? <><span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> Generating...</> : '🔁 Generate Cover'}
                </button>
              </div>
            )}
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

          {/* Song Description */}
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

        {/* ── RIGHT PANEL — Generated Songs ── */}
        {hasSongs && (
          <aside style={{
            width: 390, position: 'fixed', top: 56, right: 0, bottom: 0,
            background: '#0d0d0d', borderLeft: '1px solid rgba(255,255,255,0.08)',
            padding: '24px 20px', overflowY: 'auto', zIndex: 100,
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: "var(--font-heading,'Syne',system-ui,sans-serif)", fontSize: 15, fontWeight: 800, color: 'white', marginBottom: 4 }}>
                🎵 Generated Songs
              </div>
              <div style={{ fontSize: 12, color: '#444' }}>{clips.length} version{clips.length !== 1 ? 's' : ''} ready — edit or regenerate below</div>
            </div>

            {clips.map((clip, i) => (
              <SongCard key={i} clip={clip} index={i} onEdit={handleEditClip} onRegenerate={handleRegenerateClip} />
            ))}

            <button
              onClick={() => { setClips([]); setStatus('idle'); }}
              style={{ marginTop: 8, width: '100%', padding: '10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', background: 'transparent', color: '#333', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Clear &amp; Start Fresh
            </button>
          </aside>
        )}

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          aside { display: none !important; }
          main  { margin-left: 0 !important; margin-right: 0 !important; padding: 16px !important; }
        }
      `}</style>
    </div>
  );
}

export default function AudioPage() {
  return <AuthGuard><AudioContent /></AuthGuard>;
}