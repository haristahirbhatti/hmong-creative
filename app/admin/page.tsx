'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { createClient } from '../../lib/supabase';
import Link from 'next/link';

type User = { id: string; email: string; created_at: string; role: string; videos_generated: number; last_seen: string; };
type Stats = { total_users: number; total_videos: number; videos_today: number; active_users: number; };

export default function AdminPage() {
  const [users, setUsers]   = useState<User[]>([]);
  const [stats, setStats]   = useState<Stats>({ total_users: 0, total_videos: 0, videos_today: 0, active_users: 0 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab]       = useState<'overview'|'users'|'videos'>('overview');
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      // Check admin
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }

      // Fetch users (from profiles table — set this up in Supabase)
      const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (profiles) setUsers(profiles as User[]);

      // Fetch video stats
      const { count: totalVideos } = await supabase.from('videos').select('*', { count: 'exact', head: true });
      const today = new Date().toISOString().split('T')[0];
      const { count: todayVideos } = await supabase.from('videos').select('*', { count: 'exact', head: true }).gte('created_at', today);

      setStats({
        total_users:   profiles?.length || 0,
        total_videos:  totalVideos || 0,
        videos_today:  todayVideos || 0,
        active_users:  profiles?.filter(p => p.last_seen && new Date(p.last_seen) > new Date(Date.now() - 7*24*60*60*1000)).length || 0,
      });
      setLoading(false);
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statCards = [
    { label: 'Total Users',      value: stats.total_users,  icon: '👥', color: '#a8d8ea' },
    { label: 'Videos Generated', value: stats.total_videos, icon: '🎬', color: '#FFB347' },
    { label: 'Videos Today',     value: stats.videos_today, icon: '📈', color: '#a0ffa0' },
    { label: 'Active (7d)',      value: stats.active_users, icon: '⚡', color: '#d4aaff' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#080808', fontFamily: "'DM Sans',sans-serif", color: 'white', display: 'flex' }}>

      {/* Sidebar */}
      <aside style={{ width: 240, background: '#0f0f0f', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '24px 16px', position: 'fixed', top: 0, bottom: 0, display: 'flex', flexDirection: 'column' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 40, padding: '0 8px' }}>
          <div style={{ width: 32, height: 32, background: '#FF5C2B', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne',sans-serif", fontWeight: 800, color: 'white' }}>H</div>
          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, color: 'white' }}>Admin Panel</span>
        </Link>

        {(['overview', 'users', 'videos'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ width: '100%', padding: '11px 16px', borderRadius: 10, border: 'none', background: tab === t ? 'rgba(255,92,43,0.15)' : 'transparent', color: tab === t ? '#FF5C2B' : '#555', fontSize: 14, fontWeight: 600, cursor: 'pointer', textAlign: 'left', marginBottom: 4, textTransform: 'capitalize' }}>
            {t === 'overview' ? '📊' : t === 'users' ? '👥' : '🎬'} {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}

        <div style={{ marginTop: 'auto' }}>
          <Link href="/dashboard" style={{ display: 'block', padding: '11px 16px', color: '#444', fontSize: 14, textDecoration: 'none' }}>← Back to App</Link>
        </div>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: 240, flex: 1, padding: '40px 40px' }}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 32, marginBottom: 6 }}>
            {tab === 'overview' ? '📊 Overview' : tab === 'users' ? '👥 Users' : '🎬 Videos'}
          </h1>
          <p style={{ color: '#444', fontSize: 14 }}>Hmong Creative Admin Dashboard</p>
        </div>

        {loading ? (
          <div style={{ color: '#333', fontSize: 14 }}>Loading...</div>
        ) : tab === 'overview' ? (
          <>
            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 40 }}>
              {statCards.map(s => (
                <div key={s.label} style={{ background: '#111', borderRadius: 16, padding: '24px 20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: 28, marginBottom: 12 }}>{s.icon}</div>
                  <div style={{ fontSize: 36, fontWeight: 800, fontFamily: "'Syne',sans-serif", color: s.color, marginBottom: 4 }}>{s.value}</div>
                  <div style={{ color: '#444', fontSize: 13 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Recent Users */}
            <div style={{ background: '#111', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16 }}>Recent Signups</h3>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {['Email', 'Role', 'Videos', 'Joined'].map(h => (
                      <th key={h} style={{ padding: '12px 24px', textAlign: 'left', color: '#444', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.slice(0, 5).map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '14px 24px', fontSize: 14 }}>{u.email}</td>
                      <td style={{ padding: '14px 24px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 20, background: u.role === 'admin' ? 'rgba(255,92,43,0.2)' : 'rgba(255,255,255,0.05)', color: u.role === 'admin' ? '#FF5C2B' : '#666', fontSize: 12, fontWeight: 600 }}>{u.role || 'user'}</span>
                      </td>
                      <td style={{ padding: '14px 24px', color: '#a0ffa0', fontSize: 14, fontWeight: 700 }}>{u.videos_generated || 0}</td>
                      <td style={{ padding: '14px 24px', color: '#444', fontSize: 13 }}>{new Date(u.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={4} style={{ padding: '40px 24px', textAlign: 'center', color: '#333', fontSize: 14 }}>No users yet — connect Supabase to see data</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : tab === 'users' ? (
          <div style={{ background: '#111', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['Email', 'Role', 'Videos Generated', 'Last Seen', 'Joined', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '14px 20px', textAlign: 'left', color: '#444', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                  >
                    <td style={{ padding: '14px 20px', fontSize: 14 }}>{u.email}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, background: u.role === 'admin' ? 'rgba(255,92,43,0.2)' : 'rgba(255,255,255,0.05)', color: u.role === 'admin' ? '#FF5C2B' : '#666', fontSize: 12 }}>{u.role || 'user'}</span>
                    </td>
                    <td style={{ padding: '14px 20px', color: '#a0ffa0', fontWeight: 700 }}>{u.videos_generated || 0}</td>
                    <td style={{ padding: '14px 20px', color: '#444', fontSize: 13 }}>{u.last_seen ? new Date(u.last_seen).toLocaleDateString() : '—'}</td>
                    <td style={{ padding: '14px 20px', color: '#444', fontSize: 13 }}>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <button style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#666', fontSize: 12, cursor: 'pointer' }}>Manage</button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#333' }}>No users yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#333', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 40 }}>🎬</div>
            <p>Video history will appear here once connected to Supabase</p>
          </div>
        )}
      </main>
    </div>
  );
}
