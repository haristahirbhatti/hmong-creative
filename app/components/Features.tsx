'use client';

import { useEffect, useRef } from 'react';

const FEATURES = [
  {
    icon: '🎙️',
    num: '01',
    title: 'Audio Generation',
    desc: 'Create voiceovers, clone voices, and produce rich soundscapes from text. Give your creative worlds a voice.',
    link: 'Explore Audio →',
    accent: 'rgba(255,92,43,0.15)',
  },
  {
    icon: '🎬',
    num: '02',
    title: 'Image to Video',
    desc: 'Animate any photo into a cinematic clip. Turn still moments into moving stories with one click.',
    link: 'Make Videos →',
    accent: 'rgba(255,179,71,0.15)',
  },
  {
    icon: '🖼️',
    num: '03',
    title: 'Create Image',
    desc: 'Generate stunning images from text prompts. Edit, upscale, and enhance with advanced AI tools.',
    link: 'Generate Now →',
    accent: 'rgba(100,200,255,0.15)',
  },
];

export default function Features() {
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = cardRefs.current.indexOf(entry.target as HTMLDivElement);
            setTimeout(() => {
              const el = entry.target as HTMLDivElement;
              el.style.opacity = '1';
              el.style.transform = 'translateY(0)';
            }, idx * 130);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    cardRefs.current.forEach(card => { if (card) observer.observe(card); });
    return () => observer.disconnect();
  }, []);

  return (
    <section id="features" style={{ background: '#FAFAF8', padding: '120px 48px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          fontSize: 11, fontWeight: 700, letterSpacing: '3px',
          textTransform: 'uppercase' as const, color: '#FF5C2B', marginBottom: 14,
        }}>
          <span style={{ display: 'inline-block', width: 20, height: 2, background: '#FF5C2B' }} />
          Core Features
        </div>
        <h2 style={{
          fontFamily: 'Syne, sans-serif', fontSize: 'clamp(36px, 5vw, 60px)',
          fontWeight: 800, letterSpacing: -2, color: '#080808',
          lineHeight: 1, maxWidth: 580, marginBottom: 72,
        }}>
          Three tools.<br />
          <em style={{ fontStyle: 'italic', color: '#FF5C2B' }}>Infinite</em> possibilities.
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              ref={el => { cardRefs.current[i] = el; }}
              style={{
                background: '#080808', borderRadius: 24, padding: '40px 36px',
                position: 'relative', overflow: 'hidden', cursor: 'pointer',
                opacity: 0, transform: 'translateY(40px)',
                transition: 'opacity 0.6s ease, transform 0.6s ease, box-shadow 0.3s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = '0 28px 70px rgba(0,0,0,0.3)';
                const bar = e.currentTarget.querySelector('.feat-bar') as HTMLElement;
                if (bar) bar.style.transform = 'scaleX(1)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = 'none';
                const bar = e.currentTarget.querySelector('.feat-bar') as HTMLElement;
                if (bar) bar.style.transform = 'scaleX(0)';
              }}
            >
              <div className="feat-bar" style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: '#FF5C2B', transform: 'scaleX(0)', transformOrigin: 'left',
                transition: 'transform 0.4s ease',
              }} />
              <div style={{
                width: 60, height: 60, borderRadius: 14, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: 26, marginBottom: 26, background: f.accent,
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700, color: 'white', marginBottom: 10, letterSpacing: -0.4 }}>
                {f.title}
              </h3>
              <p style={{ fontSize: 14, color: '#777', lineHeight: 1.7, marginBottom: 24 }}>{f.desc}</p>
              <a href="#" style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                fontSize: 13, fontWeight: 600, color: '#FF5C2B', textDecoration: 'none',
                transition: 'gap 0.2s',
              }}
                onMouseEnter={e => (e.currentTarget.style.gap = '13px')}
                onMouseLeave={e => (e.currentTarget.style.gap = '7px')}
              >
                {f.link}
              </a>
              <div style={{
                position: 'absolute', bottom: -20, right: 14,
                fontFamily: 'Syne, sans-serif', fontSize: 110, fontWeight: 800,
                color: 'rgba(255,255,255,0.03)', lineHeight: 1, pointerEvents: 'none', userSelect: 'none',
              }}>{f.num}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
