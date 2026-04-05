'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase';
import { useSiteSettings } from '../../lib/useSiteSettings';
import AuthGuard from '../components/AuthGuard';

function DashboardContent() {
  const [user, setUser] = useState<{ name: string; email: string; id: string } | null>(null);
  const [stats, setStats] = useState({ videos: 0, images: 0, audio: 0 });
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();
  const { settings } = useSiteSettings();

  const loadStats = useCallback(async (uid: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('videos_generated, images_generated, audio_generated')
      .eq('id', uid)
      .single();
    if (profile) {
      setStats({
        videos: profile.videos_generated || 0,
        images: profile.images_generated || 0,
        audio: profile.audio_generated || 0,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) return; // AuthGuard handles redirect
      const name = u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'User';
      setUser({ name, email: u.email || '', id: u.id });
      await loadStats(u.id);
      setLoading(false);

      // Update last_seen
      await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', u.id);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh stats when user comes back to tab
  useEffect(() => {
    const onFocus = () => { if (user?.id) loadStats(user.id); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user, loadStats]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const TOOLS = [
    { icon: '🎬', label: 'Image to Video', desc: 'Animate your images with AI', href: '/image-to-video', enabled: settings.feature_image_to_video, color: '#FFB347', count: stats.videos, badge: 'Active' },
    { icon: '🎭', label: 'Lip Sync Avatar', desc: 'Photo + audio = talking avatar', href: '/lip-sync', enabled: true, color: '#a020a0', count: 0, badge: 'New' },
    { icon: '🎵', label: 'Audio AI', desc: 'Generate music & voiceovers', href: '/audio', enabled: settings.feature_audio_ai, color: '#d4aaff', count: stats.audio, badge: settings.feature_audio_ai ? 'Active' : 'Soon' },
    { icon: '🖼️', label: 'Create Image', desc: 'Text to image generation', href: '/create-image', enabled: settings.feature_create_image, color: '#a8d8ea', count: stats.images, badge: settings.feature_create_image ? 'Active' : 'Soon' },
  ];

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "var(--font-body, 'DM Sans', system-ui, sans-serif)", color: '#444' }}>
      <div style={{ textAlign: 'center' }}><div style={{ fontSize: 28, marginBottom: 10 }}>✦</div><p>Loading...</p></div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#080808', fontFamily: "var(--font-body, 'DM Sans', system-ui, sans-serif)", color: 'white' }}>
      {/* Navbar */}
      <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 32px)', maxWidth: 1200, background: 'rgba(255,255,255,0.96)', borderRadius: 100, padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 9999, boxShadow: '0 4px 40px rgba(0,0,0,0.12)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 30, height: 30, background: '#080808', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "var(--font-heading, 'Syne', system-ui, sans-serif)", fontWeight: 800, fontSize: 15, color: 'white' }}>H</div>
          <span style={{ fontFamily: "var(--font-heading, 'Syne', system-ui, sans-serif)", fontWeight: 800, fontSize: 15, color: '#080808' }}>{settings.site_name}</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px 6px 8px', borderRadius: 100, border: '1.5px solid rgba(0,0,0,0.08)', background: 'white' }}>
              <div style={{ width: 26, height: 26, borderRadius: 50, background: '#FF5C2B', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 700 }}>{user.name[0]?.toUpperCase()}</div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#080808', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</span>
            </div>
          )}
          <button onClick={handleLogout} style={{ padding: '8px 16px', borderRadius: 100, border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', color: '#555', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Sign Out</button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '100px 20px 80px' }}>
        {/* Welcome */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontFamily: "var(--font-heading, 'Syne', system-ui, sans-serif)", fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, marginBottom: 8, letterSpacing: -1 }}>
            Welcome back, {user?.name} 👋
          </h1>
          <p style={{ color: '#444', fontSize: 15 }}>What will you create today?</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 44 }}>
          {[
            { label: 'Videos Made', value: stats.videos, icon: '🎬', color: '#FFB347' },
            { label: 'Images Made', value: stats.images, icon: '🖼️', color: '#a8d8ea' },
            { label: 'Tracks Made', value: stats.audio, icon: '🎵', color: '#d4aaff' },
          ].map(s => (
            <div key={s.label} style={{ background: '#111', borderRadius: 16, padding: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: 24, marginBottom: 10 }}>{s.icon}</div>
              <div style={{ fontSize: 32, fontWeight: 800, fontFamily: "var(--font-heading, 'Syne', system-ui, sans-serif)", color: s.color, marginBottom: 4 }}>{s.value}</div>
              <div style={{ color: '#444', fontSize: 13 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tools */}
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ fontFamily: "var(--font-heading, 'Syne', system-ui, sans-serif)", fontWeight: 800, fontSize: 20, marginBottom: 4 }}>AI Tools</h2>
          <p style={{ color: '#444', fontSize: 14 }}>{settings.site_tagline}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {TOOLS.map(t => (
            <div key={t.href}
              onClick={() => t.enabled && router.push(t.href)}
              style={{ background: '#111', borderRadius: 20, padding: 24, border: `1px solid ${t.enabled ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)'}`, cursor: t.enabled ? 'pointer' : 'default', opacity: t.enabled ? 1 : 0.5, transition: 'all 0.2s' }}
              onMouseEnter={e => { if (t.enabled) (e.currentTarget.style.borderColor = '#FF5C2B'); }}
              onMouseLeave={e => { (e.currentTarget.style.borderColor = t.enabled ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)'); }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ width: 48, height: 48, background: 'rgba(255,255,255,0.04)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{t.icon}</div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ padding: '4px 10px', borderRadius: 20, background: t.badge === 'Active' ? 'rgba(255,92,43,0.15)' : 'rgba(255,255,255,0.06)', color: t.badge === 'Active' ? '#FF5C2B' : '#444', fontSize: 11, fontWeight: 700 }}>{t.badge}</span>
                  {t.count > 0 && <div style={{ fontSize: 11, color: t.color, marginTop: 4, fontWeight: 700 }}>{t.count} made</div>}
                </div>
              </div>
              <h3 style={{ fontFamily: "var(--font-heading, 'Syne', system-ui, sans-serif)", fontWeight: 800, fontSize: 17, marginBottom: 6, color: t.enabled ? 'white' : '#444' }}>{t.label}</h3>
              <p style={{ color: '#444', fontSize: 13, lineHeight: 1.5, margin: 0 }}>{t.desc}</p>
              {t.enabled && <div style={{ marginTop: 18, color: '#FF5C2B', fontSize: 13, fontWeight: 700 }}>Start creating →</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return <AuthGuard><DashboardContent /></AuthGuard>;
}