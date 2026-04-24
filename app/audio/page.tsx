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

type GeneratedClip = {
  audioUrl: string; title: string; lyrics: string;
  selectedTags: string[]; instrumental: boolean;
  taskId?: string; audioId?: string;
};
type VocalSep = { vocalUrl: string; instrumentalUrl: string; taskId: string };
type TimestampWord = { word: string; startTime: number; endTime: number };

function SongCard({
  clip, index, onEdit, onRegenerate, userId,
}: {
  clip: GeneratedClip; index: number;
  onEdit: (clip: GeneratedClip) => void;
  onRegenerate: (clip: GeneratedClip) => void;
  userId: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
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

  // FIX: .play() wrapped in .catch to silence AbortError
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) { audioRef.current.pause(); }
    else { audioRef.current.play().catch(() => { }); }
    setIsPlaying(!isPlaying);
  };

  const accentColor = index === 0 ? '#FF5C2B' : '#a020a0';
  const styleString = clip.selectedTags.join(' · ') || 'No style';

  const toggleFeature = (id: string) => { setActiveFeature(prev => prev === id ? null : id); setFeatError(''); };

  const runFeature = async (id: string) => {
    setFeatLoading(true); setFeatError('');
    try {
      if (id === 'gen-lyrics') {
        const r = await fetch('/api/lyrics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: `${clip.title} — ${clip.selectedTags.join(', ') || 'pop'} song` }) });
        const d = await r.json(); if (!r.ok) throw new Error(d.error); setGenLyrics(d.lyrics || '');
      } else if (id === 'timestamps') {
        const r = await fetch('/api/timestamped-lyrics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId: clip.taskId, audioId: clip.audioId }) });
        const d = await r.json(); if (!r.ok) throw new Error(d.error); setTsWords(d.words || []);
      } else if (id === 'cover') {
        const r = await fetch('/api/create-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: `Album cover for ${clip.selectedTags.join(', ') || 'pop'} song "${clip.title}", digital art, vibrant`, aspect_ratio: '1:1' }) });
        const d = await r.json(); if (!r.ok) throw new Error(d.error); setCoverUrl(d.imageUrl || '');
      } else if (id === 'vocals') {
        const r = await fetch('/api/vocal-separation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audioUrl: clip.audioUrl, userId }) });
        const d = await r.json(); if (!r.ok) throw new Error(d.error); setVocalSep({ vocalUrl: d.vocalUrl, instrumentalUrl: d.instrumentalUrl, taskId: d.taskId });
      } else if (id === 'midi') {
        if (!vocalSep) { setFeatError('Run "Split Vocals" first'); setFeatLoading(false); return; }
        const r = await fetch('/api/midi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId: vocalSep.taskId }) });
        const d = await r.json(); if (!r.ok) throw new Error(d.error); setMidiUrl(d.midiUrl || '');
      } else if (id === 'video') {
        const r = await fetch('/api/music-video', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId: clip.taskId, audioId: clip.audioId, userId }) });
        const d = await r.json(); if (!r.ok) throw new Error(d.error); setMusicVideoUrl(d.videoUrl || '');
      }
    } catch (e: unknown) { setFeatError(e instanceof Error ? e.message : 'Failed'); }
    setFeatLoading(false);
  };

  void toggleFeature; void runFeature; void genLyrics; void tsWords; void coverUrl;
  void vocalSep; void midiUrl; void musicVideoUrl; void activeFeature; void featLoading; void featError;
  void tsWords.find(w => currentTime >= w.startTime && currentTime <= w.endTime);

  return (
    <div style={{ background: '#141414', borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', padding: '16px', marginBottom: 12, flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: index === 0 ? 'linear-gradient(135deg,#FF5C2B,#e04020)' : 'linear-gradient(135deg,#a020a0,#6010b0)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M9 18V5l12-2v13M9 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm12-2c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z" /></svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clip.title || 'My Song'} {index === 0 ? '(v1)' : '(v2)'}</div>
          <div style={{ fontSize: 11, color: '#444', marginTop: 1 }}>{clip.instrumental ? 'Instrumental' : 'With lyrics'}</div>
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <button onClick={togglePlay} style={{ width: 30, height: 30, borderRadius: '50%', background: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {isPlaying ? <svg width="10" height="10" viewBox="0 0 24 24" fill="#080808"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg> : <svg width="10" height="10" viewBox="0 0 24 24" fill="#080808"><polygon points="5,3 19,12 5,21" /></svg>}
          </button>
          <div style={{ flex: 1, height: 3, background: '#2a2a2a', borderRadius: 100, cursor: 'pointer' }} onClick={e => { if (!audioRef.current) return; const r = e.currentTarget.getBoundingClientRect(); audioRef.current.currentTime = ((e.clientX - r.left) / r.width) * duration; }}>
            <div style={{ height: '100%', background: accentColor, borderRadius: 100, width: duration ? `${(currentTime / duration) * 100}%` : '0%', transition: 'width 0.1s' }} />
          </div>
          <span style={{ fontSize: 10, color: '#444', flexShrink: 0, minWidth: 28 }}>{formatTime(currentTime)}</span>
        </div>
      </div>
      <div style={{ background: '#1a1a1a', borderRadius: 12, padding: '10px 14px', marginBottom: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: 10, color: accentColor, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Used Inputs</div>
        {clip.selectedTags.length > 0 && <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>🎨 <span style={{ color: '#aaa' }}>{styleString}</span></div>}
        {!clip.instrumental && clip.lyrics && <div style={{ fontSize: 11, color: '#777', whiteSpace: 'pre-line', maxHeight: 44, overflow: 'hidden' }}>📄 {clip.lyrics.slice(0, 80)}{clip.lyrics.length > 80 ? '…' : ''}</div>}
        {clip.instrumental && <div style={{ fontSize: 11, color: '#555' }}>🎙️ Instrumental only</div>}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <button onClick={() => onEdit(clip)} style={{ flex: 1, padding: '8px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#888', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'white'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#888'; }}>✏️ Edit</button>
        <button onClick={() => onRegenerate(clip)} style={{ flex: 1, padding: '8px', borderRadius: 10, border: `1px solid ${accentColor}66`, background: `${accentColor}18`, color: accentColor, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }} onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}>🔄 Regenerate</button>
        <a href={clip.audioUrl} download={`${clip.title || 'song'}.mp3`} style={{ display: 'flex', alignItems: 'center', padding: '8px 10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', color: '#555', textDecoration: 'none' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" /></svg>
        </a>
      </div>
      {/* FIX: only index===0 autoplays — no race condition AbortError */}
      <audio ref={audioRef} src={clip.audioUrl}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => {
          setDuration(audioRef.current?.duration || 0);
          if (index === 0 && audioRef.current) { audioRef.current.play().catch(() => { }); setIsPlaying(true); }
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
  const [showCoverUpload, setShowCoverUpload] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverStyle, setCoverStyle] = useState('');
  const [coverLanguage, setCoverLanguage] = useState('');
  const [coverLyrics, setCoverLyrics] = useState('');
  const [coverLoading, setCoverLoading] = useState(false);
  const [coverResult, setCoverResult] = useState('');
  const [coverErr, setCoverErr] = useState('');
  const [activeToolId, setActiveToolId] = useState<string | null>(null);
  const [toolMsg, setToolMsg] = useState('');
  const [toolError, setToolError] = useState('');
  const [toolLoading, setToolLoading] = useState(false);
  const [toolLyrics, setToolLyrics] = useState('');
  const [toolCoverResult, setToolCoverResult] = useState('');
  const [toolCoverFile, setToolCoverFile] = useState<File | null>(null);
  const [toolCoverStyle, setToolCoverStyle] = useState('');
  const [toolCoverLang, setToolCoverLang] = useState('');
  const [toolCoverLyrics, setToolCoverLyrics] = useState('');
  const [toolTsWords, setToolTsWords] = useState<TimestampWord[]>([]);
  const [toolVocalSep, setToolVocalSep] = useState<VocalSep | null>(null);
  const [toolMidiUrl, setToolMidiUrl] = useState('');
  const [toolVideoUrl, setToolVideoUrl] = useState('');
  const [lyricsExpanded, setLyricsExpanded] = useState(false);
  const [showLyricsModal, setShowLyricsModal] = useState(false);
  const [lyricsModalPrompt, setLyricsModalPrompt] = useState('');
  const [lyricsModalLoading, setLyricsModalLoading] = useState(false);
  const [lyricsModalError, setLyricsModalError] = useState('');
  const [lyricsOptions, setLyricsOptions] = useState<{ title: string; lyrics: string }[]>([]);

  void toolTsWords; void toolVocalSep; void toolMidiUrl; void toolVideoUrl;

  const supabase = createClient();
  const hasSongs = clips.length > 0;

  useEffect(() => {
    const load = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u) {
        setUserId(u.id); setUserEmail(u.email || '');
        setUserName((u.user_metadata?.full_name as string) || (u.user_metadata?.name as string) || u.email?.split('@')[0] || 'User');
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTag = (tag: string) => setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  const styleString = selectedTags.join(' · ') || 'No style selected';

  const validateAudioFile = (file: File, onErr: (msg: string) => void): boolean => {
    if (file.size > 4 * 1024 * 1024) { onErr(`File is ${(file.size / 1024 / 1024).toFixed(1)}MB — max 4MB`); return false; }
    return true;
  };

  const generateLyricsOptions = async () => {
    if (!lyricsModalPrompt.trim()) { setLyricsModalError('Please describe what lyrics you want'); return; }
    setLyricsModalLoading(true); setLyricsModalError(''); setLyricsOptions([]);
    try {
      const VARIATIONS = [
        { suffix: '', label: 'Option 1' },
        { suffix: ' — write a completely different song with different verses, different melody feel, and different words', label: 'Option 2' },
      ];
      const options: { title: string; lyrics: string }[] = [];
      for (const v of VARIATIONS) {
        try {
          const res = await fetch('/api/lyrics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: lyricsModalPrompt + v.suffix, variation: v.label }) });
          const d = await res.json();
          if (d.lyrics) options.push({ title: d.title || v.label, lyrics: d.lyrics });
        } catch { /* skip */ }
      }
      if (options.length === 0) throw new Error('No lyrics generated — please try again');
      setLyricsOptions(options);
    } catch (e: unknown) { setLyricsModalError(e instanceof Error ? e.message : 'Generation failed'); }
    setLyricsModalLoading(false);
  };

  const selectLyricsOption = (lyricsText: string) => {
    setLyrics(lyricsText); setShowLyricsModal(false); setLyricsOptions([]); setLyricsModalPrompt('');
  };

  const handleGenerateWithArgs = async (args?: { title: string; lyrics: string; selectedTags: string[]; instrumental: boolean }) => {
    const t = args?.title ?? title; const l = args?.lyrics ?? lyrics;
    const tags = args?.selectedTags ?? selectedTags; const instr = args?.instrumental ?? instrumental;
    if (!t) { setError('Please enter a song title'); return; }
    if (!instr && !l) { setError('Please enter lyrics or enable instrumental mode'); return; }
    setStatus('generating'); setError('');
    const fullStyle = [tags.filter(tag => TAGS.Culture.includes(tag)).join(', '), tags.filter(tag => TAGS.Genre.includes(tag)).join(', '), tags.filter(tag => TAGS.Voice.includes(tag)).join(', '), tags.filter(tag => TAGS.Tempo.includes(tag)).join(', '), tags.filter(tag => TAGS.Mood.includes(tag)).join(', ')].filter(Boolean).join(', ') || 'pop';
    try {
      const res = await fetch('/api/audio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: t, lyrics: instr ? '' : l, style: fullStyle, instrumental: instr, userId, userEmail, title: t }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error);
      const inputSnapshot = { title: t, lyrics: l, selectedTags: [...tags], instrumental: instr, taskId: data.taskId || '' };
      const rawClips: { audioUrl?: string; audio_url?: string; url?: string; audioId?: string; id?: string }[] = data.clips || [];
      const builtClips: GeneratedClip[] = rawClips.slice(0, 2).map(c => ({ ...inputSnapshot, audioUrl: c.audioUrl || c.audio_url || c.url || '', audioId: c.audioId || c.id || '' })).filter(c => c.audioUrl);
      if (builtClips.length === 0 && data.audioUrl) builtClips.push({ ...inputSnapshot, audioUrl: data.audioUrl, audioId: '' });
      setClips(builtClips); setStatus('done');
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Generation failed'); setStatus('error'); }
  };

  const handleGenerate = () => handleGenerateWithArgs();
  const handleEditClip = (clip: GeneratedClip) => { setTitle(clip.title); setLyrics(clip.lyrics); setTags([...clip.selectedTags]); setInstrumental(clip.instrumental); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const handleRegenerateClip = (clip: GeneratedClip) => { setTitle(clip.title); setLyrics(clip.lyrics); setTags([...clip.selectedTags]); setInstrumental(clip.instrumental); setTimeout(() => handleGenerateWithArgs({ title: clip.title, lyrics: clip.lyrics, selectedTags: clip.selectedTags, instrumental: clip.instrumental }), 50); };

  const handleToolClick = (id: string) => {
    if (!hasSongs && ['timestamps', 'vocals', 'midi', 'video'].includes(id)) { setToolMsg('Generate a song first.'); setTimeout(() => setToolMsg(''), 3000); return; }
    setActiveToolId(prev => prev === id ? null : id); setToolMsg(''); setToolError('');
  };

  const runTool = async (id: string) => {
    setToolLoading(true); setToolError('');
    try {
      if (id === 'gen-lyrics') {
        const r = await fetch('/api/lyrics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: `${title || 'Hmong song'} — ${selectedTags.join(', ') || 'pop'} style` }) });
        const d = await r.json(); if (!r.ok) throw new Error(d.error); setToolLyrics(d.lyrics || '');
      }
    } catch (e: unknown) { setToolError(e instanceof Error ? e.message : 'Failed'); }
    setToolLoading(false);
  };

  const AI_TOOLS = [
    { id: 'gen-lyrics', icon: '✍️', label: 'Generate Lyrics', needsSong: false },
    { id: 'cover-gen', icon: '🔁', label: 'Cover Generate', needsSong: false },
  ];

  const iStyle = { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: '#141414', color: 'white' as const, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit' };
  const iStyleDark = { ...iStyle, background: '#1a1a1a' };
  const lStyle = { fontSize: 11, color: '#555', fontWeight: 600, display: 'block', marginBottom: 6 } as const;
  const spin = { width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' } as const;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', fontFamily: "var(--font-body,'DM Sans',system-ui,sans-serif)", color: 'white', display: 'flex', flexDirection: 'column' }}>

      {/* Navbar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 56, background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', zIndex: 9999 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 28, height: 28, background: '#FF5C2B', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "var(--font-heading,'Syne',system-ui,sans-serif)", fontWeight: 800, fontSize: 14, color: 'white' }}>H</div>
          <span style={{ fontFamily: "var(--font-heading,'Syne',system-ui,sans-serif)", fontWeight: 800, fontSize: 14, color: 'white' }}>Hmong Creative</span>
        </Link>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#FF5C2B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>{userName[0]?.toUpperCase()}</div>
      </div>

      <div style={{ display: 'flex', flex: 1, marginTop: 56 }}>

        {/* Sidebar */}
        <aside style={{ width: 200, background: '#0a0a0a', borderRight: '1px solid rgba(255,255,255,0.05)', padding: '24px 12px', position: 'fixed', top: 56, bottom: 0, display: 'flex', flexDirection: 'column', gap: 4, zIndex: 100 }}>
          {[{ icon: '🏠', label: 'Home', href: '/' }, { icon: '🎵', label: 'Create', href: '/audio', active: true }, { icon: '📚', label: 'Library', href: '/dashboard' }, { icon: '◀', label: 'Back', href: '/dashboard' }].map(item => (
            <Link key={item.label} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, textDecoration: 'none', background: item.active ? 'rgba(255,92,43,0.12)' : 'transparent', color: item.active ? '#FF5C2B' : '#555', fontSize: 14, fontWeight: item.active ? 700 : 500 }}
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

        {/* Main */}
        <main style={{ marginLeft: 200, marginRight: hasSongs ? 400 : 0, flex: 1, padding: '24px 28px 40px', minWidth: 0, maxWidth: 780, transition: 'margin-right 0.3s ease' }}>

          {/* Title */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#555', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Song Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Hmong Song Test 1"
              style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: '#141414', color: 'white', fontSize: 16, fontWeight: 500, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              onFocus={e => e.target.style.borderColor = '#FF5C2B'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
          </div>

          {/* Upload & Cover Audio */}
          <div style={{ marginBottom: 20, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' }}>
            <button onClick={() => setShowCoverUpload(v => !v)} style={{ width: '100%', padding: '14px 16px', background: '#141414', border: 'none', color: '#888', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'inherit', textAlign: 'left' }}>
              <span style={{ fontSize: 16 }}>🔁</span>Upload &amp; Cover Audio
              <span style={{ marginLeft: 'auto', fontSize: 10, color: '#444' }}>{showCoverUpload ? '▲' : '▼'}</span>
            </button>
            {showCoverUpload && (
              <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', background: '#0f0f0f' }}>

                {/* Audio file */}
                <div style={{ marginBottom: 12 }}>
                  <label style={lStyle}>Upload Audio File (MP3 / WAV) <span style={{ color: '#333', fontWeight: 400 }}>— max 4MB</span></label>
                  <input type="file" accept="audio/*" onChange={e => { const f = e.target.files?.[0] || null; if (f && !validateAudioFile(f, setCoverErr)) { setCoverFile(null); e.target.value = ''; } else { setCoverErr(''); setCoverFile(f); } }} style={{ fontSize: 12, color: '#888', width: '100%' }} />
                  {coverFile && <div style={{ fontSize: 11, color: '#4c4', marginTop: 4 }}>✅ {(coverFile.size / 1024 / 1024).toFixed(1)}MB — ready to upload</div>}
                </div>

                {/* Language */}
                <div style={{ marginBottom: 12 }}>
                  <label style={lStyle}>Language <span style={{ color: '#FF5C2B', fontWeight: 600 }}>(important for non-English songs)</span></label>
                  <input value={coverLanguage} onChange={e => setCoverLanguage(e.target.value)} placeholder="e.g. Urdu, Hmong, Hindi, Punjabi..."
                    style={iStyle} onFocus={e => e.target.style.borderColor = '#FF5C2B'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
                </div>

                {/* Lyrics */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ ...lStyle, color: '#FF5C2B' }}>Paste Your Lyrics (Urdu / Hmong / Hindi...) <span style={{ color: '#555', fontWeight: 400 }}>— AI will sing these exact words</span></label>
                  <textarea value={coverLyrics} onChange={e => setCoverLyrics(e.target.value)} rows={4}
                    placeholder={'Apne Urdu/Hmong lyrics yahan paste karo...\nAI inhi words ko melody pe gaayega.\nLeave empty → AI auto-generates (usually English).'}
                    style={{ ...iStyle, resize: 'vertical', lineHeight: '1.6' }}
                    onFocus={e => e.target.style.borderColor = '#FF5C2B'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
                  {coverLyrics.trim()
                    ? <div style={{ fontSize: 11, color: '#4c4', marginTop: 4 }}>✅ AI will sing your exact lyrics ({coverLyrics.trim().split('\n').length} lines)</div>
                    : <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>⚠️ Lyrics nahi doge toh AI English mein generate karega</div>}
                </div>

                {/* Style */}
                <div style={{ marginBottom: 12 }}>
                  <label style={lStyle}>Style <span style={{ color: '#333', fontWeight: 400 }}>(optional)</span></label>
                  <input value={coverStyle} onChange={e => setCoverStyle(e.target.value)} placeholder="e.g. Hmong folk, pop, R&B..."
                    style={iStyle} onFocus={e => e.target.style.borderColor = '#FF5C2B'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
                </div>

                {coverErr && <div style={{ fontSize: 12, color: '#f66', marginBottom: 10 }}>⚠️ {coverErr}</div>}

                {coverResult && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: '#FF5C2B', fontWeight: 700, marginBottom: 10 }}>✅ {coverResult.split('||').filter(Boolean).length} Cover(s) Generated</div>
                    {coverResult.split('||').filter(Boolean).map((url, i) => (
                      <div key={i} style={{ marginBottom: 10, background: '#111', borderRadius: 10, padding: '10px 12px' }}>
                        <div style={{ fontSize: 11, color: '#555', marginBottom: 6, fontWeight: 600 }}>Cover {i + 1}</div>
                        <audio controls src={url} style={{ width: '100%', marginBottom: 6 }} />
                        <a href={url} download={`cover-${i + 1}.mp3`} style={{ fontSize: 11, color: '#555', textDecoration: 'none' }}>⬇ Download Cover {i + 1}</a>
                      </div>
                    ))}
                  </div>
                )}

                <button disabled={!coverFile || coverLoading}
                  onClick={async () => {
                    if (!coverFile) return;
                    setCoverLoading(true); setCoverErr(''); setCoverResult('');
                    try {
                      const fd = new FormData();
                      fd.append('audio', coverFile);
                      fd.append('style', coverStyle || 'pop');
                      fd.append('language', coverLanguage || '');
                      fd.append('lyrics', coverLyrics || '');
                      fd.append('userId', userId);
                      const r = await fetch('/api/cover-audio', { method: 'POST', body: fd });
                      const d = await r.json(); if (!r.ok) throw new Error(d.error);
                      const cls = (d.clips || []).map((c: { audioUrl?: string }) => c.audioUrl).filter(Boolean);
                      setCoverResult(cls.length > 0 ? cls.join('||') : (d.audioUrl || ''));
                    } catch (e: unknown) { setCoverErr(e instanceof Error ? e.message : 'Failed'); }
                    setCoverLoading(false);
                  }}
                  style={{ width: '100%', padding: '10px', borderRadius: 10, border: 'none', background: !coverFile || coverLoading ? '#1a1a1a' : '#FF5C2B', color: !coverFile || coverLoading ? '#444' : 'white', fontSize: 13, fontWeight: 700, cursor: !coverFile || coverLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {coverLoading ? <><span style={spin} /> Generating...</> : '🔁 Generate Cover'}
                </button>
              </div>
            )}
          </div>

          {/* Lyrics */}
          {!instrumental && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 12, color: '#555', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>Lyrics</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: '#FF5C2B', background: 'rgba(255,92,43,0.1)', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>AI will sing exactly these words</span>
                  <button onClick={() => { setShowLyricsModal(true); setLyricsOptions([]); setLyricsModalPrompt(''); setLyricsModalError(''); }}
                    style={{ padding: '4px 12px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.15)', background: '#1a1a1a', color: '#aaa', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#FF5C2B'; e.currentTarget.style.color = '#FF5C2B'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#aaa'; }}>✨ Write Full Song</button>
                  <button onClick={() => setLyricsExpanded(v => !v)} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: '#1a1a1a', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {lyricsExpanded
                      ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="4,14 10,14 10,20" /><polyline points="20,10 14,10 14,4" /><line x1="10" y1="14" x2="3" y2="21" /><line x1="21" y1="3" x2="14" y2="10" /></svg>
                      : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15,3 21,3 21,9" /><polyline points="9,21 3,21 3,15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>}
                  </button>
                </div>
              </div>
              <textarea value={lyrics} onChange={e => setLyrics(e.target.value)} rows={lyricsExpanded ? 20 : 7}
                placeholder={'Khaws wb cov lus\nLos txog hnub no\nPhem los zoo\nKuv yeej tsis tso'}
                style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: '#141414', color: 'white', fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.8, transition: 'all 0.3s ease' }}
                onFocus={e => e.target.style.borderColor = '#FF5C2B'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
            </div>
          )}

          {/* Song Description */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#555', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Song Description <span style={{ color: '#333', textTransform: 'none', fontSize: 11, fontWeight: 400 }}>(optional)</span></label>
            <input placeholder="e.g. Pop, cinematic, emotional..."
              style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: '#141414', color: 'white', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              onFocus={e => e.target.style.borderColor = '#FF5C2B'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
          </div>

          {/* Instrumental toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: '#141414', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 24 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}><span style={{ fontSize: 16 }}>🎙️</span><span style={{ fontSize: 14, fontWeight: 600 }}>Instrumental Mode</span></div>
              <div style={{ fontSize: 12, color: '#444', paddingLeft: 24 }}>Toggle to remove all vocals</div>
            </div>
            <button onClick={() => setInstrumental(!instrumental)} style={{ width: 48, height: 26, borderRadius: 100, border: 'none', background: instrumental ? '#FF5C2B' : '#2a2a2a', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
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
                  <span style={{ fontSize: 13 }}>{section === 'Culture' ? '🏔️' : section === 'Mood' ? '💭' : section === 'Genre' ? '🎸' : section === 'Voice' ? '🎤' : '⏱️'}</span>
                  <span style={{ fontSize: 12, color: '#444', fontWeight: 600 }}>{section}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {tags.map(tag => {
                    const active = selectedTags.includes(tag); return (
                      <button key={tag} onClick={() => toggleTag(tag)} style={{ padding: '7px 14px', borderRadius: 100, border: `1px solid ${active ? '#FF5C2B' : 'rgba(255,255,255,0.1)'}`, background: active ? 'rgba(255,92,43,0.15)' : 'transparent', color: active ? '#FF5C2B' : '#777', fontSize: 13, fontWeight: active ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                        {active && '✓ '}{tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* AI Tools */}
          <div style={{ marginBottom: 24, background: '#0f0f0f', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}><span style={{ fontSize: 14 }}>⚡</span><span style={{ fontSize: 12, fontWeight: 700, color: '#555', letterSpacing: 0.5, textTransform: 'uppercase' }}>AI Tools</span></div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {AI_TOOLS.map(tool => {
                const isLocked = tool.needsSong && !hasSongs; const isActive = activeToolId === tool.id; return (
                  <button key={tool.id} onClick={() => { handleToolClick(tool.id); if (!isLocked && activeToolId !== tool.id) runTool(tool.id); }}
                    style={{ padding: '8px 14px', borderRadius: 100, border: `1px solid ${isActive ? '#FF5C2B' : isLocked ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.1)'}`, background: isActive ? 'rgba(255,92,43,0.15)' : 'transparent', color: isActive ? '#FF5C2B' : isLocked ? '#333' : '#777', fontSize: 13, cursor: isLocked ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {tool.icon} {tool.label}{isLocked && <span style={{ fontSize: 10, opacity: 0.5 }}>🔒</span>}
                  </button>
                );
              })}
            </div>
            {toolMsg && <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,92,43,0.08)', border: '1px solid rgba(255,92,43,0.2)', color: '#FF5C2B', fontSize: 13 }}>⚠️ {toolMsg}</div>}
            {toolError && <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', color: '#f66', fontSize: 13 }}>⚠️ {toolError}</div>}
            {toolLoading && <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, color: '#555', fontSize: 13 }}><span style={{ ...spin, border: '2px solid #333', borderTopColor: '#FF5C2B' }} />Processing...</div>}

            {!toolLoading && activeToolId && (
              <div style={{ marginTop: 14, background: '#141414', borderRadius: 12, padding: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>

                {activeToolId === 'gen-lyrics' && (
                  <div>
                    <div style={{ fontSize: 11, color: '#FF5C2B', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>✍️ Generated Lyrics</div>
                    {!toolLyrics && !toolLoading && <button onClick={() => runTool('gen-lyrics')} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#FF5C2B', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Generate Lyrics</button>}
                    {toolLyrics && <><pre style={{ fontSize: 13, color: '#aaa', whiteSpace: 'pre-wrap', lineHeight: 1.8, margin: '0 0 10px', fontFamily: 'inherit' }}>{toolLyrics}</pre>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => navigator.clipboard.writeText(toolLyrics)} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#888', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>📋 Copy</button>
                        <button onClick={() => { setToolLyrics(''); runTool('gen-lyrics'); }} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(255,92,43,0.3)', background: 'transparent', color: '#FF5C2B', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>🔄 Regenerate</button>
                      </div></>}
                  </div>
                )}

                {activeToolId === 'cover-gen' && (
                  <div>
                    <div style={{ fontSize: 11, color: '#FF5C2B', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>🔁 Cover Generate</div>
                    <div style={{ marginBottom: 10 }}>
                      <label style={lStyle}>Upload Audio (MP3/WAV) <span style={{ color: '#333', fontWeight: 400 }}>— max 4MB</span></label>
                      <input type="file" accept="audio/*" onChange={e => { const f = e.target.files?.[0] || null; if (f && !validateAudioFile(f, setToolError)) { setToolCoverFile(null); e.target.value = ''; } else { setToolError(''); setToolCoverFile(f); } }} style={{ fontSize: 12, color: '#888', width: '100%' }} />
                      {toolCoverFile && <div style={{ fontSize: 11, color: '#4c4', marginTop: 4 }}>✅ {(toolCoverFile.size / 1024 / 1024).toFixed(1)}MB — ready</div>}
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <label style={lStyle}>Language <span style={{ color: '#FF5C2B', fontWeight: 600 }}>(Urdu, Hmong, Hindi...)</span></label>
                      <input value={toolCoverLang} onChange={e => setToolCoverLang(e.target.value)} placeholder="e.g. Urdu, Hmong, Hindi..." style={iStyleDark} onFocus={e => e.target.style.borderColor = '#FF5C2B'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ ...lStyle, color: '#FF5C2B' }}>Paste Lyrics <span style={{ color: '#555', fontWeight: 400 }}>— AI will sing these exact words</span></label>
                      <textarea value={toolCoverLyrics} onChange={e => setToolCoverLyrics(e.target.value)} rows={3}
                        placeholder={'Apne Urdu/Hmong lyrics yahan paste karo...\nLeave empty → AI auto-generates (usually English).'}
                        style={{ ...iStyleDark, resize: 'vertical', lineHeight: '1.6' }} onFocus={e => e.target.style.borderColor = '#FF5C2B'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
                      {!toolCoverLyrics.trim() && <div style={{ fontSize: 11, color: '#555', marginTop: 3 }}>⚠️ Lyrics nahi doge toh AI English mein generate karega</div>}
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <label style={lStyle}>Style (optional)</label>
                      <input value={toolCoverStyle} onChange={e => setToolCoverStyle(e.target.value)} placeholder="e.g. Hmong folk, pop..." style={iStyleDark} onFocus={e => e.target.style.borderColor = '#FF5C2B'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
                    </div>
                    {toolCoverResult && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, color: '#4c4', marginBottom: 10, fontWeight: 600 }}>✅ {toolCoverResult.split('||').filter(Boolean).length} Cover(s) Ready</div>
                        {toolCoverResult.split('||').filter(Boolean).map((url, i) => (
                          <div key={i} style={{ marginBottom: 10, background: '#1a1a1a', borderRadius: 10, padding: '10px 12px' }}>
                            <div style={{ fontSize: 11, color: '#555', marginBottom: 6, fontWeight: 600 }}>Cover {i + 1}</div>
                            <audio controls src={url} style={{ width: '100%', marginBottom: 6 }} />
                            <a href={url} download={`cover-${i + 1}.mp3`} style={{ fontSize: 11, color: '#555', textDecoration: 'none' }}>⬇ Download</a>
                          </div>
                        ))}
                      </div>
                    )}
                    <button disabled={!toolCoverFile || toolLoading}
                      onClick={async () => {
                        if (!toolCoverFile) return;
                        setToolLoading(true); setToolError('');
                        try {
                          const fd = new FormData();
                          fd.append('audio', toolCoverFile);
                          fd.append('style', toolCoverStyle || 'pop');
                          fd.append('language', toolCoverLang || '');
                          fd.append('lyrics', toolCoverLyrics || '');
                          fd.append('userId', userId);
                          const r = await fetch('/api/cover-audio', { method: 'POST', body: fd });
                          const d = await r.json(); if (!r.ok) throw new Error(d.error);
                          const cls = (d.clips || []).map((cl: { audioUrl?: string }) => cl.audioUrl).filter(Boolean);
                          setToolCoverResult(cls.length > 0 ? cls.join('||') : (d.audioUrl || ''));
                        } catch (e: unknown) { setToolError(e instanceof Error ? e.message : 'Failed'); }
                        setToolLoading(false);
                      }}
                      style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: !toolCoverFile || toolLoading ? '#1a1a1a' : '#FF5C2B', color: !toolCoverFile || toolLoading ? '#444' : 'white', fontSize: 13, fontWeight: 700, cursor: !toolCoverFile || toolLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8 }}>
                      {toolLoading ? <><span style={spin} />Generating...</> : '🔁 Generate Cover'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Will generate preview */}
          {(title || selectedTags.length > 0) && (
            <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 18px', marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#444', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>WILL GENERATE:</div>
              {title && <div style={{ fontSize: 13, color: '#888', marginBottom: 6 }}>📄 <strong style={{ color: 'white' }}>Title:</strong> {title}</div>}
              <div style={{ fontSize: 13, color: '#888', marginBottom: 6 }}>{instrumental ? '🎵 Instrumental only' : '🎤 With your exact lyrics'}</div>
              {selectedTags.length > 0 && <div style={{ fontSize: 13, color: '#888' }}>✨ <strong style={{ color: 'white' }}>Style:</strong> <span style={{ color: '#FF5C2B' }}>{styleString}</span></div>}
            </div>
          )}

          {error && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.25)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, color: '#ff6666', fontSize: 13 }}>⚠️ {error}</div>}

          <button onClick={status === 'generating' ? undefined : handleGenerate} disabled={status === 'generating'}
            style={{ width: '100%', padding: '16px', borderRadius: 14, border: 'none', background: status === 'generating' ? 'linear-gradient(90deg,#c44,#a33)' : 'linear-gradient(90deg,#FF5C2B,#e04020)', color: 'white', fontSize: 15, fontWeight: 700, cursor: status === 'generating' ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            {status === 'generating' ? <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />Generating...</> : <>✦ Create Song</>}
          </button>
        </main>

        {/* Right panel */}
        {hasSongs && (
          <aside style={{ width: 390, position: 'fixed', top: 56, right: 0, bottom: 0, background: '#0d0d0d', borderLeft: '1px solid rgba(255,255,255,0.08)', padding: '24px 20px', overflowY: 'auto', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: "var(--font-heading,'Syne',system-ui,sans-serif)", fontSize: 15, fontWeight: 800, color: 'white', marginBottom: 4 }}>🎵 Generated Songs</div>
              <div style={{ fontSize: 12, color: '#444' }}>{clips.length} version{clips.length !== 1 ? 's' : ''} ready</div>
            </div>
            {clips.map((clip, i) => <SongCard key={i} clip={clip} index={i} userId={userId} onEdit={handleEditClip} onRegenerate={handleRegenerateClip} />)}
            <button onClick={() => { setClips([]); setStatus('idle'); }} style={{ marginTop: 8, width: '100%', padding: '10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', background: 'transparent', color: '#333', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Clear &amp; Start Fresh</button>
          </aside>
        )}
      </div>

      {/* Lyrics Modal */}
      {showLyricsModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={e => { if (e.target === e.currentTarget) setShowLyricsModal(false); }}>
          <div style={{ background: '#111', borderRadius: 20, width: '100%', maxWidth: 900, maxHeight: '90vh', display: 'flex', flexDirection: 'column', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: "var(--font-heading,'Syne',system-ui,sans-serif)", fontWeight: 800, fontSize: 18, color: 'white' }}>✍️ Write Full Song</div>
                <div style={{ fontSize: 12, color: '#444', marginTop: 2 }}>Describe your song and AI will generate 2 lyric options</div>
              </div>
              <button onClick={() => setShowLyricsModal(false)} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#555', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>✕</button>
            </div>
            {lyricsOptions.length > 0 && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {lyricsOptions.map((opt, i) => (
                    <div key={i} style={{ background: '#0a0a0a', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}><div style={{ fontFamily: "var(--font-heading,'Syne',system-ui,sans-serif)", fontWeight: 800, fontSize: 16, color: 'white' }}>{opt.title || `Option ${i + 1}`}</div></div>
                      <div style={{ flex: 1, padding: '14px 16px', overflowY: 'auto', maxHeight: 320 }}><pre style={{ fontSize: 13, color: '#888', whiteSpace: 'pre-wrap', lineHeight: 1.9, margin: 0, fontFamily: 'inherit' }}>{opt.lyrics}</pre></div>
                      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}><button onClick={() => selectLyricsOption(opt.lyrics)} style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: 'linear-gradient(90deg,#FF5C2B,#e04020)', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Select This Option</button></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {lyricsOptions.length === 0 && !lyricsModalLoading && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                <div style={{ textAlign: 'center' }}><div style={{ fontSize: 48, marginBottom: 16 }}>✍️</div><div style={{ fontSize: 15, color: '#555', marginBottom: 4 }}>Enter a prompt below to generate lyrics.</div><div style={{ fontSize: 12, color: '#333' }}>AI will create 2 different lyric options for you to choose from.</div></div>
              </div>
            )}
            {lyricsModalLoading && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                <div style={{ textAlign: 'center' }}><span style={{ width: 40, height: 40, border: '3px solid rgba(255,92,43,0.3)', borderTopColor: '#FF5C2B', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block', marginBottom: 16 }} /><div style={{ fontSize: 14, color: '#555' }}>Writing your lyrics...</div></div>
              </div>
            )}
            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', background: '#0d0d0d' }}>
              {lyricsModalError && <div style={{ fontSize: 12, color: '#f66', marginBottom: 10 }}>⚠️ {lyricsModalError}</div>}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: '#1a1a1a', borderRadius: 14, padding: '10px 16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ color: '#FF5C2B', fontSize: 14, flexShrink: 0 }}>✦</span>
                  <input value={lyricsModalPrompt} onChange={e => setLyricsModalPrompt(e.target.value)} onKeyDown={e => e.key === 'Enter' && !lyricsModalLoading && generateLyricsOptions()} placeholder="Describe the lyrics you want, or share a theme or topic..." style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'white', fontSize: 14, fontFamily: 'inherit' }} />
                </div>
                <button onClick={generateLyricsOptions} disabled={lyricsModalLoading || !lyricsModalPrompt.trim()}
                  style={{ padding: '12px 20px', borderRadius: 14, border: 'none', background: lyricsModalLoading || !lyricsModalPrompt.trim() ? '#1a1a1a' : 'linear-gradient(90deg,#FF5C2B,#e04020)', color: lyricsModalLoading || !lyricsModalPrompt.trim() ? '#444' : 'white', fontSize: 14, fontWeight: 700, cursor: lyricsModalLoading || !lyricsModalPrompt.trim() ? 'not-allowed' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {lyricsModalLoading ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />Writing...</> : <>✍️ Write Lyrics</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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