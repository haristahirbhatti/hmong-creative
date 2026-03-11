'use client';

import { useEffect, useRef } from 'react';

const CARDS = [
  { id: 'c1', label: '📷 Photo',    name: 'Gallery',  emoji: '🖼️', bg: 'linear-gradient(135deg,#1a1a2e,#16213e)', color: '#a8d8ea', w: 110, h: 110,
    // position as % of viewport so it scales — top/left are from center
    tx: -28, ty: -18 },
  { id: 'c2', label: '🎵 Music',    name: 'Audio',    emoji: '🎶', bg: 'linear-gradient(135deg,#1a0030,#3d0060)', color: '#d4aaff', w: 120, h: 120,
    tx:  0,  ty: -30 },
  { id: 'c3', label: '🤖 Create',   name: 'Generate', emoji: '✦',  bg: 'linear-gradient(135deg,#2a0010,#4a0020)', color: '#ffaacc', w: 115, h:  88,
    tx:  26, ty: -20 },
  { id: 'c4', label: '🎬 Video',    name: 'Clips',    emoji: '▶️', bg: 'linear-gradient(135deg,#2d1b00,#4a2c00)', color: '#FFB347', w: 130, h: 100,
    tx: -30, ty:  15 },
  { id: 'c5', label: '🔊 Audio AI', name: 'Voice',    emoji: '⚡', bg: 'linear-gradient(135deg,#0a2a0a,#1a4a1a)', color: '#a0ffa0', w: 105, h: 105,
    tx:  0,  ty:  28 },
  { id: 'c6', label: '✨ Icons',    name: 'Assets',   emoji: '🎨', bg: 'linear-gradient(135deg,#001a1a,#003333)', color: '#80ffdd', w: 100, h: 100,
    tx:  28, ty:  15 },
];

// Rotations per card
const ROTS: Record<string, number> = { c1: -8, c2: 7, c3: -7, c4: 5, c5: 3, c6: -4 };

function ease(t: number) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }
function clamp(v: number, a: number, b: number) { return Math.max(a, Math.min(b, v)); }

type SavedPos = { startX: number; startY: number; endX: number; endY: number };

export default function HeroScroll() {
  const wrapRef  = useRef<HTMLDivElement>(null);
  const stickyRef= useRef<HTMLDivElement>(null);
  const bgRef    = useRef<HTMLDivElement>(null);
  const ringRef  = useRef<HTMLDivElement>(null);
  const heroRef  = useRef<HTMLDivElement>(null);
  const hintRef  = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const posRef   = useRef<Record<string, SavedPos>>({});
  const raf      = useRef<number | null>(null);

  // NAVBAR HEIGHT — must match Navbar spacer
  const NAV = 80;

  const layout = () => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Ring goes at true center of visible area (below nav)
    const availH = vh - NAV;
    const cx = vw / 2;
    const cy = NAV + availH / 2;

    if (ringRef.current) {
      ringRef.current.style.left = `${cx - 90}px`;
      ringRef.current.style.top  = `${cy - 90}px`;
    }
    if (heroRef.current) {
      heroRef.current.style.left = `${cx}px`;
      heroRef.current.style.top  = `${cy}px`;
    }

    CARDS.forEach(c => {
      const el = cardRefs.current[c.id];
      if (!el) return;

      // tx/ty are % of half-viewport width/height
      const rawLeft = cx + (c.tx / 100) * vw - c.w / 2;
      const rawTop  = cy + (c.ty / 100) * availH - c.h / 2;

      // HARD CLAMP — card top can never go above NAV
      const left = rawLeft;
      const top  = Math.max(NAV + 8, rawTop);

      el.style.left    = `${left}px`;
      el.style.top     = `${top}px`;
      el.style.opacity = '1';
      el.style.transform = `rotate(${ROTS[c.id]}deg)`;

      // Save actual center pos for animation
      posRef.current[c.id] = {
        startX: left + c.w / 2,
        startY: top  + c.h / 2,
        endX:   cx,
        endY:   cy,
      };
    });
  };

  const tick = () => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const scrolled = window.scrollY - wrap.offsetTop;
    const total    = wrap.scrollHeight - window.innerHeight;
    const p = clamp(scrolled / total, 0, 1);

    const mergeE = ease(clamp(p / 0.45, 0, 1));
    const whiteE = ease(clamp((p - 0.45) / 0.2, 0, 1));
    const heroE  = ease(clamp((p - 0.65) / 0.2, 0, 1));

    // Cards
    CARDS.forEach(c => {
      const el  = cardRefs.current[c.id];
      const pos = posRef.current[c.id];
      if (!el || !pos) return;
      const tx = (pos.endX - pos.startX) * mergeE;
      const ty = (pos.endY - pos.startY) * mergeE;
      el.style.transform = `translate(${tx}px,${ty}px) scale(${1 - mergeE * 0.65}) rotate(${ROTS[c.id]}deg)`;
      el.style.opacity   = String(1 - mergeE);
    });

    // Background fade
    if (bgRef.current)   bgRef.current.style.opacity   = String(1 - whiteE);
    if (ringRef.current) ringRef.current.style.opacity  = String(clamp(1 - whiteE * 2.5, 0, 1));
    if (hintRef.current) hintRef.current.style.opacity  = String(clamp(1 - mergeE * 3, 0, 1));

    // Hero text
    if (heroRef.current) {
      heroRef.current.style.opacity   = String(heroE);
      heroRef.current.style.transform = `translate(-50%,calc(-50% + ${(1 - heroE) * 30}px))`;
    }
  };

  const onScroll = () => {
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => { tick(); raf.current = null; });
  };

  useEffect(() => {
    layout(); tick();
    document.fonts.ready.then(() => { layout(); tick(); });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => { layout(); tick(); });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', () => { layout(); tick(); });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={wrapRef} style={{ position: 'relative', height: '500vh' }}>
      <div ref={stickyRef} style={{
        position: 'sticky', top: 0,
        width: '100%', height: '100vh',
        // overflow hidden CLIPS everything — cards cannot escape this box
        overflow: 'hidden',
      }}>
        {/* White bg (bottom layer) */}
        <div style={{ position: 'absolute', inset: 0, background: '#FAFAF8', zIndex: 0 }} />
        {/* Black bg (fades out) */}
        <div ref={bgRef} style={{ position: 'absolute', inset: 0, background: '#080808', zIndex: 1 }} />

        {/* ── CLIPPING MASK: covers top NAV px, same color as bg ─── */}
        {/* This sits above cards (z20) but below nothing — hides any card pixel above NAV line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: NAV,
          background: '#080808',
          zIndex: 50,
          pointerEvents: 'none',
        }} />

        {/* Ring */}
        <div ref={ringRef} style={{
          position: 'absolute', zIndex: 10, pointerEvents: 'none',
          width: 180, height: 180, borderRadius: '50%',
          border: '12px solid rgba(255,255,255,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 136, height: 136, borderRadius: '50%',
            background: '#0f0f0f', border: '2px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontFamily:"'Syne',sans-serif", fontSize: 50, fontWeight: 800, color: 'white', letterSpacing: -4, userSelect: 'none' }}>H</span>
          </div>
        </div>

        {/* Cards */}
        {CARDS.map(c => (
          <div key={c.id} ref={el => { cardRefs.current[c.id] = el; }} style={{
            position: 'absolute', width: c.w, height: c.h,
            borderRadius: 16, zIndex: 20,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 8,
            fontFamily: "'Syne',sans-serif", fontSize: 11, fontWeight: 700,
            letterSpacing: '0.5px', textTransform: 'uppercase',
            background: c.bg, color: c.color,
            border: '1px solid rgba(255,255,255,0.1)',
            willChange: 'transform,opacity',
          }}>
            <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)', color: 'white', fontSize: 9, fontWeight: 600, padding: '3px 7px', borderRadius: 20 }}>{c.label}</div>
            <div style={{ fontSize: 28 }}>{c.emoji}</div>
            <span>{c.name}</span>
          </div>
        ))}

        {/* Hero Text — appears after merge */}
        <div ref={heroRef} style={{
          position: 'absolute', zIndex: 30,
          width: '100%', textAlign: 'center',
          opacity: 0, pointerEvents: 'none', padding: '0 20px',
          transform: 'translate(-50%, -50%)',
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: '#FF5C2B', marginBottom: 18 }}>Hmong Creative Media Studio</p>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(40px,6.5vw,80px)', fontWeight: 800, letterSpacing: -3, lineHeight: 0.93, color: '#080808', marginBottom: 22 }}>
            Where <em style={{ fontStyle:'italic', color:'#FF5C2B' }}>Culture</em><br/>
            Meets <em style={{ fontStyle:'italic', color:'#FF5C2B' }}>Creation</em>
          </h1>
          <p style={{ fontSize: 16, color: '#555', maxWidth: 460, margin: '0 auto 32px', lineHeight: 1.6 }}>
            Generate stunning visuals, craft audio, and produce videos — powered by AI.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <a href="/signup" style={{ background: '#080808', color: 'white', padding: '14px 28px', borderRadius: 100, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Start Creating Free →</a>
            <a href="/image-to-video" style={{ color: '#444', padding: '14px 24px', borderRadius: 100, fontSize: 14, fontWeight: 500, textDecoration: 'none', border: '1.5px solid #ddd' }}>See Features</a>
          </div>
        </div>

        {/* Scroll hint */}
        <div ref={hintRef} style={{
          position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          zIndex: 25, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 10, letterSpacing: '2.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>Scroll</span>
          <div className="scroll-line" />
        </div>

      </div>
    </div>
  );
}
