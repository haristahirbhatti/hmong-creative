'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '../../lib/supabase';
import { useSiteSettings } from '../../lib/useSiteSettings';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [user, setUser] = useState<{ email: string; name: string } | null>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const { settings } = useSiteSettings();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data: { user: u }, error } = await supabase.auth.getUser();
        if (error || !u) {
          // Silently clear bad session — don't redirect from navbar
          if (error?.message?.includes('Refresh Token')) {
            await supabase.auth.signOut();
          }
          setUser(null);
          return;
        }
        const name = u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'User';
        setUser({ email: u.email || '', name });
      } catch {
        setUser(null);
      }
    };
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Auth state listener — only once, not on every pathname change
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        const loadUser = async () => {
          try {
            const { data: { user: u }, error } = await supabase.auth.getUser();
            if (error || !u) { setUser(null); return; }
            const name = u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'User';
            setUser({ email: u.email || '', name });
          } catch { setUser(null); }
        };
        loadUser();
      }
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← empty deps — subscribe only once

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (featuresRef.current && !featuresRef.current.contains(e.target as Node)) setFeaturesOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserMenuOpen(false);
    router.push('/');
  };

  const handleFeatureClick = (href: string, enabled: boolean) => {
    setFeaturesOpen(false);
    if (!enabled) return;
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent(href));
      return;
    }
    router.push(href);
  };

  const FEATURES = [
    { icon: '🎬', label: 'Image to Video', desc: 'Animate your images with AI', href: '/image-to-video', enabled: settings.feature_image_to_video, badge: 'New' },
    { icon: '🎭', label: 'Lip Sync Avatar', desc: 'Photo + audio = talking avatar', href: '/lip-sync', enabled: true, badge: 'New' },
    { icon: '🎵', label: 'Audio AI', desc: 'Generate music & voiceovers', href: '/audio', enabled: settings.feature_audio_ai, badge: settings.feature_audio_ai ? 'New' : 'Soon' },
    { icon: '🖼️', label: 'Create Image', desc: 'Text to image generation', href: '/create-image', enabled: settings.feature_create_image, badge: settings.feature_create_image ? 'New' : 'Soon' },
  ];

  return (
    <>
      <div style={{ height: 80 }} />
      <nav style={{
        position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)', maxWidth: 1200,
        background: scrolled ? 'rgba(255,255,255,0.98)' : 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(20px)', borderRadius: 100, padding: '10px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        zIndex: 9999, boxShadow: '0 4px 40px rgba(0,0,0,0.12)', transition: 'all 0.2s',
      }}>

        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', flexShrink: 0 }}>
          <div style={{ width: 30, height: 30, background: '#080808', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, color: 'white' }}>H</div>
          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, color: '#080808' }}>{settings.site_name}</span>
        </Link>

        {/* Center */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div ref={featuresRef} style={{ position: 'relative' }}>
            <button onClick={() => setFeaturesOpen(!featuresOpen)}
              style={{ padding: '8px 16px', borderRadius: 100, border: 'none', background: featuresOpen ? 'rgba(0,0,0,0.06)' : 'transparent', color: '#333', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
              Features <span style={{ fontSize: 10, transform: featuresOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>▼</span>
            </button>
            {featuresOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', background: 'white', borderRadius: 16, boxShadow: '0 8px 40px rgba(0,0,0,0.15)', padding: 8, minWidth: 280, zIndex: 10000 }}>
                {FEATURES.map(f => (
                  <button key={f.href} onClick={() => handleFeatureClick(f.href, f.enabled)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: 'none', background: 'transparent', cursor: f.enabled ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 12, opacity: f.enabled ? 1 : 0.5, fontFamily: 'inherit' }}
                    onMouseEnter={e => { if (f.enabled) (e.currentTarget.style.background = '#f5f5f5'); }}
                    onMouseLeave={e => { (e.currentTarget.style.background = 'transparent'); }}>
                    <span style={{ fontSize: 22 }}>{f.icon}</span>
                    <div style={{ textAlign: 'left', flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#080808' }}>{f.label}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>{f.desc}</div>
                    </div>
                    <span style={{ padding: '3px 8px', borderRadius: 20, background: f.badge === 'New' ? '#FF5C2B' : '#eee', color: f.badge === 'New' ? 'white' : '#888', fontSize: 10, fontWeight: 700 }}>{f.badge}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Link href="/dashboard" style={{ padding: '8px 16px', borderRadius: 100, fontSize: 14, color: '#555', textDecoration: 'none', fontWeight: 500 }}>Dashboard</Link>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {user ? (
            <div ref={userRef} style={{ position: 'relative' }}>
              <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px 6px 8px', borderRadius: 100, border: '1.5px solid rgba(0,0,0,0.08)', background: userMenuOpen ? '#f5f5f5' : 'white', cursor: 'pointer', fontFamily: 'inherit' }}>
                <div style={{ width: 26, height: 26, borderRadius: 50, background: '#FF5C2B', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 700 }}>{user.name[0]?.toUpperCase()}</div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#080808', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</span>
                <span style={{ fontSize: 9, color: '#888' }}>▼</span>
              </button>
              {userMenuOpen && (
                <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: 'white', borderRadius: 14, boxShadow: '0 8px 40px rgba(0,0,0,0.15)', padding: 8, minWidth: 200, zIndex: 10000 }}>
                  <div style={{ padding: '8px 14px 12px', borderBottom: '1px solid #f0f0f0', marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#080808' }}>{user.name}</div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{user.email}</div>
                  </div>
                  <Link href="/dashboard" onClick={() => setUserMenuOpen(false)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, fontSize: 13, color: '#333', textDecoration: 'none', fontWeight: 500 }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    📊 Dashboard
                  </Link>
                  <button onClick={handleLogout}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, border: 'none', background: 'transparent', fontSize: 13, color: '#ff4444', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fff5f5')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    🚪 Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login" style={{ padding: '8px 18px', borderRadius: 100, fontSize: 14, color: '#555', textDecoration: 'none', fontWeight: 500 }}>Sign In</Link>
              <Link href="/signup" style={{ background: '#080808', color: 'white', padding: '9px 20px', borderRadius: 100, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>Start Creating →</Link>
            </>
          )}
        </div>
      </nav>
    </>
  );
}