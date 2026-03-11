'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { createClient } from '../../lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const [user, setUser]     = useState<{email?: string; user_metadata?: {full_name?: string}} | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUser(user);
      setLoading(false);
    };
    getUser();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#444', fontFamily: "'DM Sans',sans-serif", fontSize: 14 }}>Loading...</div>
    </div>
  );

  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Creator';

  const tools = [
    { icon: '🎬', label: 'Image to Video', desc: 'Turn any image into a video', href: '/image-to-video', color: '#FFB347', badge: 'Popular' },
    { icon: '🎵', label: 'Audio AI',        desc: 'Generate music & voiceovers', href: '#', color: '#d4aaff', badge: 'Soon' },
    { icon: '🖼️', label: 'Create Image',   desc: 'AI image generation',         href: '#', color: '#a8d8ea', badge: 'Soon' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#080808', fontFamily: "'DM Sans',sans-serif", color: 'white' }}>

      {/* Navbar */}
      <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 48px)', maxWidth: 1200, background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(20px)', borderRadius: 100, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 9999, boxShadow: '0 4px 40px rgba(0,0,0,0.15)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 32, height: 32, background: '#080808', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 16, color: 'white' }}>H</div>
          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, color: '#080808' }}>Hmong Creative</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 14, color: '#555' }}>{user?.email}</span>
          <button onClick={handleLogout} style={{ background: '#080808', color: 'white', padding: '9px 20px', borderRadius: 100, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer' }}>Sign Out</button>
        </div>
      </div>

      {/* Main */}
      <div style={{ paddingTop: 100, maxWidth: 1100, margin: '0 auto', padding: '100px 24px 60px' }}>

        {/* Welcome */}
        <div style={{ marginBottom: 48 }}>
          <p style={{ color: '#FF5C2B', fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>Dashboard</p>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 'clamp(32px,4vw,52px)', letterSpacing: -2, marginBottom: 8 }}>
            Welcome back, {name} 👋
          </h1>
          <p style={{ color: '#555', fontSize: 16 }}>What do you want to create today?</p>
        </div>

        {/* Tools */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20, marginBottom: 52 }}>
          {tools.map(t => (
            <Link key={t.label} href={t.href} style={{ textDecoration: 'none' }}>
              <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: '28px 24px', cursor: 'pointer', transition: 'border-color 0.2s, transform 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#FF5C2B'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>{t.icon}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: t.badge === 'Soon' ? 'rgba(255,255,255,0.06)' : 'rgba(255,92,43,0.15)', color: t.badge === 'Soon' ? '#444' : '#FF5C2B', letterSpacing: 0.5 }}>{t.badge}</span>
                </div>
                <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 18, marginBottom: 6, color: 'white' }}>{t.label}</h3>
                <p style={{ color: '#444', fontSize: 14, lineHeight: 1.5 }}>{t.desc}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Recent Activity */}
        <div style={{ background: '#111', borderRadius: 20, border: '1px solid rgba(255,255,255,0.05)', padding: '28px 24px' }}>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 18, marginBottom: 24 }}>Recent Generations</h2>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: 12 }}>
            <div style={{ fontSize: 40 }}>🎬</div>
            <p style={{ color: '#333', fontSize: 14 }}>No generations yet — create your first video!</p>
            <Link href="/image-to-video" style={{ marginTop: 8, background: '#FF5C2B', color: 'white', padding: '10px 24px', borderRadius: 100, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
              Try Image to Video →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
