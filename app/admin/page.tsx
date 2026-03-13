'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { createClient } from '../../lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type User = { id: string; email: string; created_at: string; role: string; videos_generated: number; last_seen: string; };

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'users' | 'videos'>('overview');
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      try {
        // 1. Check if logged in
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/admin/login'); return; }

        // 2. Check admin email
        const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
        // If no admin emails set in env, allow any logged in user (for dev)
        if (adminEmails.length > 0 && !adminEmails.includes(user.email || '')) {
          router.push('/dashboard');
          return;
        }

        setAuthChecked(true);

        // 3. Try fetching profiles — if table doesn't exist, just show empty
        try {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
          if (profiles) setUsers(profiles as User[]);
        } catch {
          // Table doesn't exist yet — that's fine
        }

      } catch (e) {
        console.error(e);
        router.push('/admin/login');
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // Stats derived from users array
  const stats = [
    { label: 'Total Users', value: users.length, icon: '👥', color: '#a8d8ea' },
    { label: 'Videos Generated', value: users.reduce((a, u) => a + (u.videos_generated || 0), 0), icon: '🎬', color: '#FFB347' },
    { label: 'Active (7d)', value: users.filter(u => u.last_seen && new Date(u.last_seen) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length, icon: '⚡', color: '#d4aaff' },
    { label: 'Admins', value: users.filter(u => u.role === 'admin').length, icon: '🔐', color: '#a0ffa0' },
  ];

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ textAlign: 'center', color: '#444' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚙️</div>
        <p>Loading admin panel...</p>
      </div>
    </div>
  );

  if (!authChecked) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#080808', fontFamily: "'DM Sans',sans-serif", color: 'white', display: 'flex' }}>

      {/* Sidebar */}
      <aside style={{ width: 240, background: '#0a0a0a', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '28px 16px', position: 'fixed', top: 0, bottom: 0, display: 'flex', flexDirection: 'column', zIndex: 100 }}>

        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 8, padding: '0 8px' }}>
          <div style={{ width: 32, height: 32, background: '#FF5C2B', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne',sans-serif", fontWeight: 800, color: 'white', fontSize: 16 }}>H</div>
          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, color: 'white' }}>Admin Panel</span>
        </Link>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '16px 8px 20px' }} />

        {/* Nav */}
        {([
          { id: 'overview', icon: '📊', label: 'Overview' },
          { id: 'users', icon: '👥', label: 'Users' },
          { id: 'videos', icon: '🎬', label: 'Videos' },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: 'none', background: tab === t.id ? 'rgba(255,92,43,0.12)' : 'transparent', color: tab === t.id ? '#FF5C2B' : '#555', fontSize: 14, fontWeight: 600, cursor: 'pointer', textAlign: 'left', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'inherit' }}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', color: '#444', fontSize: 14, textDecoration: 'none', borderRadius: 10 }}
            onMouseEnter={e => (e.currentTarget.style.color = '#888')}
            onMouseLeave={e => (e.currentTarget.style.color = '#444')}
          >← Dashboard</Link>
          <button onClick={handleLogout} style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: 'none', background: 'transparent', color: '#333', fontSize: 14, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ff4444')}
            onMouseLeave={e => (e.currentTarget.style.color = '#333')}
          >🚪 Sign Out</button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ marginLeft: 240, flex: 1, padding: '44px 40px', maxWidth: 'calc(100vw - 240px)' }}>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 30, marginBottom: 6 }}>
            {tab === 'overview' ? '📊 Overview' : tab === 'users' ? '👥 Users' : '🎬 Videos'}
          </h1>
          <p style={{ color: '#444', fontSize: 14 }}>Hmong Creative — Admin Dashboard</p>
        </div>

        {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <>
            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 32 }}>
              {stats.map(s => (
                <div key={s.label} style={{ background: '#111', borderRadius: 16, padding: '22px 20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: 26, marginBottom: 10 }}>{s.icon}</div>
                  <div style={{ fontSize: 34, fontWeight: 800, fontFamily: "'Syne',sans-serif", color: s.color, marginBottom: 4 }}>{s.value}</div>
                  <div style={{ color: '#444', fontSize: 13 }}>{s.label}</div>
                </div>
              ))}
            </div>



            {/* Recent Users Table */}
            <div style={{ background: '#111', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
              <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15 }}>Recent Signups</h3>
                <span style={{ color: '#444', fontSize: 13 }}>{users.length} total</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {['Email', 'Role', 'Videos', 'Joined'].map(h => (
                      <th key={h} style={{ padding: '12px 24px', textAlign: 'left', color: '#333', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.slice(0, 8).map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '13px 24px', fontSize: 14 }}>{u.email}</td>
                      <td style={{ padding: '13px 24px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 20, background: u.role === 'admin' ? 'rgba(255,92,43,0.2)' : 'rgba(255,255,255,0.05)', color: u.role === 'admin' ? '#FF5C2B' : '#555', fontSize: 11, fontWeight: 700 }}>{u.role || 'user'}</span>
                      </td>
                      <td style={{ padding: '13px 24px', color: '#a0ffa0', fontWeight: 700 }}>{u.videos_generated || 0}</td>
                      <td style={{ padding: '13px 24px', color: '#444', fontSize: 13 }}>{new Date(u.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: '48px 24px', textAlign: 'center', color: '#2a2a2a', fontSize: 14 }}>
                        No users yet — setup Supabase tables above
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* USERS TAB */}
        {tab === 'users' && (
          <div style={{ background: '#111', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15 }}>All Users</h3>
              <span style={{ color: '#444', fontSize: 13 }}>{users.length} total</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['Email', 'Role', 'Videos', 'Last Seen', 'Joined', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 20px', textAlign: 'left', color: '#333', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.15s' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                  >
                    <td style={{ padding: '13px 20px', fontSize: 14 }}>{u.email}</td>
                    <td style={{ padding: '13px 20px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, background: u.role === 'admin' ? 'rgba(255,92,43,0.2)' : 'rgba(255,255,255,0.05)', color: u.role === 'admin' ? '#FF5C2B' : '#555', fontSize: 11, fontWeight: 700 }}>{u.role || 'user'}</span>
                    </td>
                    <td style={{ padding: '13px 20px', color: '#a0ffa0', fontWeight: 700 }}>{u.videos_generated || 0}</td>
                    <td style={{ padding: '13px 20px', color: '#444', fontSize: 13 }}>{u.last_seen ? new Date(u.last_seen).toLocaleDateString() : '—'}</td>
                    <td style={{ padding: '13px 20px', color: '#444', fontSize: 13 }}>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '13px 20px' }}>
                      <button style={{ padding: '5px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#555', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
                        onMouseEnter={e => { (e.currentTarget.style.borderColor = '#FF5C2B'); (e.currentTarget.style.color = '#FF5C2B'); }}
                        onMouseLeave={e => { (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'); (e.currentTarget.style.color = '#555'); }}
                      >Manage</button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#2a2a2a' }}>No users yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* VIDEOS TAB */}
        {tab === 'videos' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 320, gap: 14, color: '#2a2a2a' }}>
            <div style={{ fontSize: 48 }}>🎬</div>
            <p style={{ fontSize: 15 }}>Video history will show here after Supabase setup</p>
            <button onClick={() => setTab('overview')} style={{ marginTop: 8, padding: '10px 24px', borderRadius: 100, border: '1px solid #222', background: 'transparent', color: '#444', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>View Setup Guide</button>
          </div>
        )}

      </main>
    </div>
  );
}