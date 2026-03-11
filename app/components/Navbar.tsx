'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const FEATURES = [
  { icon: '🎬', label: 'Image to Video', desc: 'Animate any image with AI',     href: '/image-to-video', badge: 'New' },
  { icon: '🎵', label: 'Audio AI',        desc: 'Generate music & voiceovers',   href: '#', badge: 'Soon' },
  { icon: '🖼️', label: 'Create Image',   desc: 'Text to image generation',      href: '#', badge: 'Soon' },
];

export default function Navbar() {
  const path = usePathname();
  const [featOpen, setFeatOpen] = useState(false);

  return (
    <>
      <div style={{ height: 80 }} />
      <nav style={{
        position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
        width: 'calc(100% - 48px)', maxWidth: 1200,
        background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(20px)',
        borderRadius: 100, padding: '12px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        zIndex: 9999, boxShadow: '0 4px 40px rgba(0,0,0,0.15)',
      }}>

        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, background: '#080808', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 2a7 7 0 100 14A7 7 0 009 2z" stroke="white" strokeWidth="1.5"/>
              <path d="M6 9h6M9 6v6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, color: '#080808' }}>Hmong Creative</span>
        </Link>

        {/* Nav Links */}
        <ul style={{ display: 'flex', alignItems: 'center', gap: 4, listStyle: 'none', margin: '0 16px', position: 'relative' }}>

          {/* Features with dropdown */}
          <li style={{ position: 'relative' }}
            onMouseEnter={() => setFeatOpen(true)}
            onMouseLeave={() => setFeatOpen(false)}
          >
            <button style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 100, border: 'none',
              fontSize: 14, fontWeight: 500,
              color: featOpen ? '#FF5C2B' : '#333',
              background: featOpen ? 'rgba(255,92,43,0.06)' : 'transparent',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Features
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transition: 'transform 0.2s', transform: featOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* Dropdown */}
            {featOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 12px)', left: '50%', transform: 'translateX(-50%)',
                background: 'white', borderRadius: 20,
                boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.06)',
                padding: '12px', minWidth: 300, zIndex: 10000,
              }}>
                {/* Arrow */}
                <div style={{ position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)', width: 12, height: 12, background: 'white', borderTop: '1px solid rgba(0,0,0,0.06)', borderLeft: '1px solid rgba(0,0,0,0.06)', rotate: '45deg' }} />

                {FEATURES.map(f => (
                  <Link key={f.label} href={f.href} style={{ textDecoration: 'none' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                      opacity: f.badge === 'Soon' ? 0.5 : 1,
                    }}
                      onMouseEnter={e => { if (f.badge !== 'Soon') (e.currentTarget as HTMLElement).style.background = 'rgba(255,92,43,0.06)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <div style={{ width: 42, height: 42, borderRadius: 12, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{f.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, color: '#080808' }}>{f.label}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: f.badge === 'Soon' ? '#f0f0f0' : 'rgba(255,92,43,0.12)', color: f.badge === 'Soon' ? '#999' : '#FF5C2B', letterSpacing: 0.5 }}>{f.badge}</span>
                        </div>
                        <p style={{ fontSize: 12, color: '#888', margin: 0 }}>{f.desc}</p>
                      </div>
                      {f.badge !== 'Soon' && (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: '#ccc', flexShrink: 0 }}>
                          <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  </Link>
                ))}

                <div style={{ height: 1, background: '#f0f0f0', margin: '8px 0' }} />
                <div style={{ padding: '8px 14px' }}>
                  <p style={{ fontSize: 12, color: '#aaa', margin: 0 }}>More features coming soon 🚀</p>
                </div>
              </div>
            )}
          </li>

          {/* Other links */}
          {[
            { label: 'Discover', href: '#discover' },
            { label: 'Pricing',  href: '#pricing' },
            { label: 'Blog',     href: '#blog' },
          ].map(item => (
            <li key={item.label}>
              <Link href={item.href} style={{
                display: 'flex', alignItems: 'center',
                padding: '8px 14px', borderRadius: 100,
                fontSize: 14, fontWeight: 500, color: path === item.href ? '#FF5C2B' : '#333',
                textDecoration: 'none',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#FF5C2B'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,92,43,0.06)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#333'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >{item.label}</Link>
            </li>
          ))}
        </ul>

        {/* Auth Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <Link href="/login" style={{ padding: '9px 18px', borderRadius: 100, fontSize: 14, fontWeight: 500, color: '#555', textDecoration: 'none' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#080808')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#555')}
          >Sign In</Link>
          <Link href="/signup" style={{ background: '#080808', color: 'white', padding: '10px 22px', borderRadius: 100, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#FF5C2B')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '#080808')}
          >Start Creating →</Link>
        </div>

      </nav>
    </>
  );
}
