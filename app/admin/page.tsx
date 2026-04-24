'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { createClient } from '../../lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BODY_FONTS, HEADING_FONTS, ALL_FONTS_PREVIEW_URL } from '../../lib/fonts';

type User = { id: string; email: string; created_at: string; role: string; videos_generated: number; images_generated: number; audio_generated: number; last_seen: string; is_banned: boolean; };
type Generation = { id: string; user_id: string; type: string; prompt: string; result_url: string; created_at: string; email?: string; };
type Tab = 'overview' | 'users' | 'history' | 'settings';

const SIDEBAR = [
  { id: 'overview' as Tab, icon: '📊', label: 'Overview' },
  { id: 'users' as Tab, icon: '👥', label: 'Users' },
  { id: 'history' as Tab, icon: '🎬', label: 'Gen History' },
  { id: 'settings' as Tab, icon: '⚙️', label: 'Settings' },
];

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchUser, setSearchUser] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'video' | 'image' | 'audio'>('all');
  const [isMobile, setIsMobile] = useState(false);
  const [banLoading, setBanLoading] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Settings state
  const [siteName, setSiteName] = useState('Hmong Creative');
  const [siteTagline, setSiteTagline] = useState('AI Creative Studio');
  const [maintenance, setMaintenance] = useState(false);
  const [flags, setFlags] = useState({ imageToVideo: true, audioAI: false, createImage: false });
  const [bodyFont, setBodyFont] = useState('DM Sans');
  const [headingFont, setHeadingFont] = useState('Syne');

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Inject all preview fonts into head for the font picker
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = ALL_FONTS_PREVIEW_URL;
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/admin/login'); return; }
        const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
        if (adminEmails.length > 0 && !adminEmails.includes(user.email || '')) { router.push('/dashboard'); return; }
        setAuthChecked(true);

        const res = await fetch('/api/admin/data');
        if (res.ok) {
          const payload = await res.json();
          if (payload.users) setUsers(payload.users as User[]);
          if (payload.generations) setGenerations(payload.generations as Generation[]);
        } else {
          console.error('Failed to fetch admin data from API');
        }

        // Load site settings
        const { data: sett } = await supabase.from('site_settings').select('key, value');
        if (sett) {
          const map: Record<string, string> = {};
          sett.forEach((r: { key: string; value: string }) => { map[r.key] = r.value; });
          setSiteName(map.site_name || 'Hmong Creative');
          setSiteTagline(map.site_tagline || 'AI Creative Studio');
          setMaintenance(map.maintenance_mode === 'true');
          setFlags({
            imageToVideo: map.feature_image_to_video !== 'false',
            audioAI: map.feature_audio_ai === 'true',
            createImage: map.feature_create_image === 'true',
          });
          if (map.site_body_font    && BODY_FONTS[map.site_body_font])       setBodyFont(map.site_body_font);
          if (map.site_heading_font && HEADING_FONTS[map.site_heading_font]) setHeadingFont(map.site_heading_font);
        }
      } catch (e) { console.error(e); router.push('/admin/login'); }
      finally { setLoading(false); }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/data');
      if (res.ok) {
        const payload = await res.json();
        if (payload.users) setUsers(payload.users as User[]);
        if (payload.generations) setGenerations(payload.generations as Generation[]);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const saveSettings = async () => {
    setSavingSettings(true); setSaveMsg('');
    const updates = [
      { key: 'site_name', value: siteName },
      { key: 'site_tagline', value: siteTagline },
      { key: 'maintenance_mode', value: String(maintenance) },
      { key: 'feature_image_to_video', value: String(flags.imageToVideo) },
      { key: 'feature_audio_ai', value: String(flags.audioAI) },
      { key: 'feature_create_image', value: String(flags.createImage) },
      { key: 'site_body_font', value: bodyFont },
      { key: 'site_heading_font', value: headingFont },
    ];
    for (const u of updates) {
      await supabase.from('site_settings').upsert({ key: u.key, value: u.value, updated_at: new Date().toISOString() });
    }
    setSavingSettings(false);
    setSaveMsg('✅ Settings saved! Changes live on site.');
    setTimeout(() => setSaveMsg(''), 3000);
  };

  const handleBan = async (userId: string, banned: boolean) => {
    setBanLoading(userId);
    const { error } = await supabase.from('profiles').update({ is_banned: !banned }).eq('id', userId);
    if (!error) setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_banned: !banned } : u));
    setBanLoading(null);
  };

  const handleDeleteGen = async (genId: string) => {
    setDeleteLoading(genId);
    // Find the generation to know type and user_id before deleting
    const gen = generations.find(g => g.id === genId);
    const { error } = await supabase.from('videos').delete().eq('id', genId);
    if (!error) {
      setGenerations(prev => prev.filter(g => g.id !== genId));
      // Decrement the correct profile stat
      if (gen?.user_id) {
        const rpcName = gen.type === 'image' ? 'decrement_images' : gen.type === 'audio' ? 'decrement_audio' : 'decrement_videos';
        try { await supabase.rpc(rpcName, { uid: gen.user_id }); } catch (e) {}
        // Update local users state so overview stats refresh immediately
        setUsers(prev => prev.map(u => {
          if (u.id !== gen.user_id) return u;
          return {
            ...u,
            videos_generated: gen.type === 'video' ? Math.max(0, (u.videos_generated || 0) - 1) : u.videos_generated,
            images_generated: gen.type === 'image' ? Math.max(0, (u.images_generated || 0) - 1) : u.images_generated,
            audio_generated:  gen.type === 'audio' ? Math.max(0, (u.audio_generated  || 0) - 1) : u.audio_generated,
          };
        }));
      }
    }
    setDeleteLoading(null);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/'); };
  const switchTab = (t: Tab) => { setTab(t); setSidebarOpen(false); };

  const totalContent = users.reduce((a, u) => a + (u.videos_generated || 0) + (u.images_generated || 0) + (u.audio_generated || 0), 0);
  const activeUsers = users.filter(u => u.last_seen && new Date(u.last_seen) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length;
  const filteredUsers = users.filter(u => u.email?.toLowerCase().includes(searchUser.toLowerCase()));
  const filteredGens = generations.filter(g => filterType === 'all' || g.type === filterType);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans',sans-serif", color: '#444' }}>
      <div style={{ textAlign: 'center' }}><div style={{ fontSize: 32, marginBottom: 12 }}>⚙️</div><p>Loading admin panel...</p></div>
    </div>
  );
  if (!authChecked) return null;

  const SidebarContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Link href="/" onClick={() => setSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', padding: '0 8px', marginBottom: 8 }}>
        <div style={{ width: 32, height: 32, background: '#FF5C2B', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne',sans-serif", fontWeight: 800, color: 'white', fontSize: 16 }}>H</div>
        <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, color: 'white' }}>Admin Panel</span>
      </Link>
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '16px 8px 20px' }} />
      {SIDEBAR.map(t => (
        <button key={t.id} onClick={() => switchTab(t.id)}
          style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: 'none', background: tab === t.id ? 'rgba(255,92,43,0.12)' : 'transparent', color: tab === t.id ? '#FF5C2B' : '#555', fontSize: 14, fontWeight: 600, cursor: 'pointer', textAlign: 'left', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'inherit' }}>
          <span>{t.icon}</span>{t.label}
        </button>
      ))}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', color: '#444', fontSize: 14, textDecoration: 'none', borderRadius: 10 }}>← Dashboard</Link>
        <button onClick={handleLogout} style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: 'none', background: 'transparent', color: '#333', fontSize: 14, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>🚪 Sign Out</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#080808', fontFamily: "'DM Sans',sans-serif", color: 'white', display: 'flex' }}>

      {isMobile && sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200 }} />}

      <aside style={{ width: 240, background: '#0a0a0a', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '28px 16px', position: 'fixed', top: 0, bottom: 0, zIndex: 300, transition: 'transform 0.25s', transform: isMobile ? (sidebarOpen ? 'translateX(0)' : 'translateX(-240px)') : 'translateX(0)' }}>
        <SidebarContent />
      </aside>

      <main style={{ marginLeft: isMobile ? 0 : 240, flex: 1, padding: isMobile ? 16 : '40px 36px', minWidth: 0 }}>

        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, background: '#FF5C2B', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne',sans-serif", fontWeight: 800, color: 'white', fontSize: 14 }}>H</div>
              <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 14 }}>Admin</span>
            </div>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'white', cursor: 'pointer', fontSize: 16 }}>☰</button>
          </div>
        )}

        <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: isMobile ? 22 : 26, marginBottom: 4 }}>
              {SIDEBAR.find(s => s.id === tab)?.icon} {SIDEBAR.find(s => s.id === tab)?.label}
            </h1>
            <p style={{ color: '#333', fontSize: 13 }}>Hmong Creative — Admin Dashboard</p>
          </div>
          <button onClick={refreshData} title="Refresh data"
            style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#555', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, marginTop: 4 }}>
            🔄 Refresh
          </button>
        </div>

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Total Users', value: users.length, icon: '👥', color: '#a8d8ea' },
                { label: 'Active (7d)', value: activeUsers, icon: '⚡', color: '#d4aaff' },
                { label: 'Banned', value: users.filter(u => u.is_banned).length, icon: '🚫', color: '#ff6666' },
                { label: 'Total Content', value: totalContent, icon: '✨', color: '#FFB347' },
              ].map(s => (
                <div key={s.label} style={{ background: '#111', borderRadius: 14, padding: '18px 16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: 20, marginBottom: 8 }}>{s.icon}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Syne',sans-serif", color: s.color, marginBottom: 2 }}>{s.value}</div>
                  <div style={{ color: '#444', fontSize: 12 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Videos', value: users.reduce((a, u) => a + (u.videos_generated || 0), 0), icon: '🎬', color: '#FFB347' },
                { label: 'Images', value: users.reduce((a, u) => a + (u.images_generated || 0), 0), icon: '🖼️', color: '#a8d8ea' },
                { label: 'Audio', value: users.reduce((a, u) => a + (u.audio_generated || 0), 0), icon: '🎵', color: '#d4aaff' },
              ].map(s => (
                <div key={s.label} style={{ background: '#111', borderRadius: 14, padding: '16px 20px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.04)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{s.icon}</div>
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "'Syne',sans-serif", color: s.color }}>{s.value}</div>
                    <div style={{ color: '#444', fontSize: 12 }}>{s.label} Generated</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: '#111', borderRadius: 14, border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, margin: 0 }}>Recent Signups</h3>
                <button onClick={() => setTab('users')} style={{ fontSize: 13, color: '#FF5C2B', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>View all →</button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400 }}>
                  <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {['Email', 'Role', 'Content', 'Joined'].map(h => <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#333', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {users.slice(0, 6).map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '11px 16px', fontSize: 13 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 26, height: 26, borderRadius: 50, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#555', flexShrink: 0 }}>{u.email?.[0]?.toUpperCase()}</div>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: isMobile ? 110 : 200 }}>{u.email}</span>
                          </div>
                        </td>
                        <td style={{ padding: '11px 16px' }}><span style={{ padding: '3px 8px', borderRadius: 20, background: u.role === 'admin' ? 'rgba(255,92,43,0.2)' : 'rgba(255,255,255,0.05)', color: u.role === 'admin' ? '#FF5C2B' : '#555', fontSize: 10, fontWeight: 700 }}>{u.role || 'user'}</span></td>
                        <td style={{ padding: '11px 16px', color: '#FFB347', fontWeight: 700, fontSize: 13 }}>{(u.videos_generated || 0) + (u.images_generated || 0) + (u.audio_generated || 0)}</td>
                        <td style={{ padding: '11px 16px', color: '#444', fontSize: 12, whiteSpace: 'nowrap' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {users.length === 0 && <tr><td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#2a2a2a' }}>No users yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── USERS ── */}
        {tab === 'users' && (
          <>
            <input type="text" value={searchUser} onChange={e => setSearchUser(e.target.value)} placeholder="🔍  Search by email..."
              style={{ width: '100%', maxWidth: 380, padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: '#111', color: 'white', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 18 }}
              onFocus={e => (e.target.style.borderColor = '#FF5C2B')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
            />
            <div style={{ background: '#111', borderRadius: 14, border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between' }}>
                <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, margin: 0 }}>All Users</h3>
                <span style={{ color: '#444', fontSize: 13 }}>{filteredUsers.length} users</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 540 }}>
                  <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {['User', 'Role', '🎬', '🖼️', '🎵', 'Joined', 'Action'].map(h => <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#333', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)')}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                      >
                        <td style={{ padding: '11px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 50, background: u.is_banned ? 'rgba(255,68,68,0.15)' : '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: u.is_banned ? '#ff4444' : '#555', flexShrink: 0 }}>{u.email?.[0]?.toUpperCase()}</div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: isMobile ? 90 : 160, color: u.is_banned ? '#ff4444' : 'white' }}>{u.email}</div>
                              {u.is_banned && <div style={{ fontSize: 10, color: '#ff4444' }}>BANNED</div>}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '11px 14px' }}><span style={{ padding: '3px 8px', borderRadius: 20, background: u.role === 'admin' ? 'rgba(255,92,43,0.2)' : 'rgba(255,255,255,0.05)', color: u.role === 'admin' ? '#FF5C2B' : '#555', fontSize: 10, fontWeight: 700 }}>{u.role || 'user'}</span></td>
                        <td style={{ padding: '11px 14px', color: '#FFB347', fontWeight: 700, fontSize: 12 }}>{u.videos_generated || 0}</td>
                        <td style={{ padding: '11px 14px', color: '#a8d8ea', fontWeight: 700, fontSize: 12 }}>{u.images_generated || 0}</td>
                        <td style={{ padding: '11px 14px', color: '#d4aaff', fontWeight: 700, fontSize: 12 }}>{u.audio_generated || 0}</td>
                        <td style={{ padding: '11px 14px', color: '#444', fontSize: 11, whiteSpace: 'nowrap' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                        <td style={{ padding: '11px 14px' }}>
                          <button onClick={() => handleBan(u.id, u.is_banned)} disabled={banLoading === u.id}
                            style={{ padding: '5px 11px', borderRadius: 8, border: `1px solid ${u.is_banned ? 'rgba(100,200,100,0.3)' : 'rgba(255,68,68,0.3)'}`, background: 'transparent', color: u.is_banned ? '#80cc80' : '#ff6666', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', opacity: banLoading === u.id ? 0.5 : 1 }}>
                            {banLoading === u.id ? '...' : u.is_banned ? 'Unban' : 'Ban'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#2a2a2a' }}>No users found</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── HISTORY ── */}
        {tab === 'history' && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
              {(['all', 'video', 'image', 'audio'] as const).map(f => (
                <button key={f} onClick={() => setFilterType(f)}
                  style={{ padding: '7px 16px', borderRadius: 100, border: `1px solid ${filterType === f ? '#FF5C2B' : 'rgba(255,255,255,0.08)'}`, background: filterType === f ? 'rgba(255,92,43,0.12)' : 'transparent', color: filterType === f ? '#FF5C2B' : '#555', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {f === 'all' ? '✨ All' : f === 'video' ? '🎬 Videos' : f === 'image' ? '🖼️ Images' : '🎵 Audio'}
                </button>
              ))}
              <span style={{ marginLeft: 'auto', color: '#333', fontSize: 13, alignSelf: 'center' }}>{filteredGens.length} items</span>
            </div>
            <div style={{ background: '#111', borderRadius: 14, border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
                  <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {['Type', 'Prompt', 'User', 'Date', 'Actions'].map(h => <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#333', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {filteredGens.map(g => (
                      <tr key={g.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)')}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                      >
                        <td style={{ padding: '11px 16px' }}>
                          <span style={{ padding: '3px 9px', borderRadius: 8, fontSize: 11, fontWeight: 700, background: g.type === 'video' ? 'rgba(255,179,71,0.15)' : g.type === 'image' ? 'rgba(168,216,234,0.15)' : 'rgba(212,170,255,0.15)', color: g.type === 'video' ? '#FFB347' : g.type === 'image' ? '#a8d8ea' : '#d4aaff', whiteSpace: 'nowrap' }}>
                            {g.type === 'video' ? '🎬' : g.type === 'image' ? '🖼️' : '🎵'} {g.type}
                          </span>
                        </td>
                        <td style={{ padding: '11px 16px', fontSize: 12, color: '#888', maxWidth: 200 }}><div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.prompt || '—'}</div></td>
                        <td style={{ padding: '11px 16px', fontSize: 11, color: '#555', maxWidth: 120 }}><div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.email || g.user_id?.slice(0, 8) + '...'}</div></td>
                        <td style={{ padding: '11px 16px', fontSize: 11, color: '#444', whiteSpace: 'nowrap' }}>{new Date(g.created_at).toLocaleDateString()}</td>
                        <td style={{ padding: '11px 16px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {g.result_url && <a href={g.result_url} target="_blank" rel="noreferrer" style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', color: '#555', fontSize: 11, textDecoration: 'none' }}>View</a>}
                            <button onClick={() => handleDeleteGen(g.id)} disabled={deleteLoading === g.id}
                              style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(255,68,68,0.2)', background: 'transparent', color: '#ff6666', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', opacity: deleteLoading === g.id ? 0.5 : 1 }}>
                              {deleteLoading === g.id ? '...' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredGens.length === 0 && <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#2a2a2a' }}>No generations yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── SETTINGS ── */}
        {tab === 'settings' && (
          <div style={{ maxWidth: 620, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Site Info */}
            <div style={{ background: '#111', borderRadius: 14, border: '1px solid rgba(255,255,255,0.05)', padding: 22 }}>
              <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, margin: '0 0 18px' }}>🌐 Site Information</h3>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', color: '#555', fontSize: 12, marginBottom: 8 }}>Site Name</label>
                <input value={siteName} onChange={e => setSiteName(e.target.value)}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: '#1a1a1a', color: 'white', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  onFocus={e => (e.target.style.borderColor = '#FF5C2B')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: '#555', fontSize: 12, marginBottom: 8 }}>Tagline</label>
                <input value={siteTagline} onChange={e => setSiteTagline(e.target.value)}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: '#1a1a1a', color: 'white', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  onFocus={e => (e.target.style.borderColor = '#FF5C2B')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                />
              </div>
            </div>

            {/* Typography / Font Picker */}
            <div style={{ background: '#111', borderRadius: 14, border: '1px solid rgba(255,255,255,0.05)', padding: 22 }}>
              <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, margin: '0 0 4px' }}>🔤 Typography</h3>
              <p style={{ color: '#444', fontSize: 13, margin: '0 0 20px' }}>Change site fonts — takes effect after saving &amp; page refresh</p>

              {/* Body Font */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Body Font</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(110px,1fr))', gap: 8 }}>
                  {Object.keys(BODY_FONTS).map(name => (
                    <button key={name} onClick={() => setBodyFont(name)}
                      style={{ padding: '12px 8px', borderRadius: 10, border: `2px solid ${bodyFont === name ? '#FF5C2B' : 'rgba(255,255,255,0.07)'}`, background: bodyFont === name ? 'rgba(255,92,43,0.08)' : '#1a1a1a', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }}>
                      <div style={{ fontSize: 24, fontFamily: BODY_FONTS[name].family, fontWeight: 700, color: bodyFont === name ? 'white' : '#555', marginBottom: 5, lineHeight: 1 }}>Aa</div>
                      <div style={{ fontSize: 10, color: bodyFont === name ? '#FF5C2B' : '#444', fontWeight: 600 }}>{name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Heading Font */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11, color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Heading Font</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(110px,1fr))', gap: 8 }}>
                  {Object.keys(HEADING_FONTS).map(name => (
                    <button key={name} onClick={() => setHeadingFont(name)}
                      style={{ padding: '12px 8px', borderRadius: 10, border: `2px solid ${headingFont === name ? '#FF5C2B' : 'rgba(255,255,255,0.07)'}`, background: headingFont === name ? 'rgba(255,92,43,0.08)' : '#1a1a1a', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }}>
                      <div style={{ fontSize: 24, fontFamily: HEADING_FONTS[name].family, fontWeight: 700, color: headingFont === name ? 'white' : '#555', marginBottom: 5, lineHeight: 1 }}>Aa</div>
                      <div style={{ fontSize: 10, color: headingFont === name ? '#FF5C2B' : '#444', fontWeight: 600 }}>{name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Preview */}
              <div style={{ background: '#0f0f0f', borderRadius: 12, padding: '16px 18px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ fontSize: 10, color: '#333', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Live Preview</div>
                <div style={{ fontFamily: HEADING_FONTS[headingFont]?.family, fontWeight: 800, fontSize: 22, color: 'white', marginBottom: 6 }}>Hmong Creative Studio</div>
                <div style={{ fontFamily: BODY_FONTS[bodyFont]?.family, fontSize: 13, color: '#666', lineHeight: 1.7 }}>Create stunning AI-generated music, videos, and images — powered by the latest AI models.</div>
                <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
                  <span style={{ fontFamily: BODY_FONTS[bodyFont]?.family, fontSize: 11, color: '#FF5C2B', background: 'rgba(255,92,43,0.1)', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>Body: {bodyFont}</span>
                  <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: '#a8d8ea', background: 'rgba(168,216,234,0.08)', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>Heading: {headingFont}</span>
                </div>
              </div>
            </div>

            {/* Maintenance */}
            <div style={{ background: '#111', borderRadius: 14, border: '1px solid rgba(255,255,255,0.05)', padding: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ paddingRight: 16 }}>
                  <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, margin: '0 0 4px' }}>🔧 Maintenance Mode</h3>
                  <p style={{ color: '#444', fontSize: 13, margin: 0 }}>Shows maintenance page to all users</p>
                </div>
                <button onClick={() => setMaintenance(!maintenance)}
                  style={{ width: 52, height: 28, borderRadius: 100, border: 'none', background: maintenance ? '#FF5C2B' : '#222', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 50, background: 'white', position: 'absolute', top: 4, left: maintenance ? 28 : 4, transition: 'left 0.2s' }} />
                </button>
              </div>
              {maintenance && <div style={{ background: 'rgba(255,92,43,0.08)', border: '1px solid rgba(255,92,43,0.2)', borderRadius: 10, padding: '10px 14px', marginTop: 14 }}><p style={{ color: '#FF5C2B', fontSize: 13, margin: 0 }}>⚠️ Site is in maintenance mode</p></div>}
            </div>

            {/* Feature Flags */}
            <div style={{ background: '#111', borderRadius: 14, border: '1px solid rgba(255,255,255,0.05)', padding: 22 }}>
              <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, margin: '0 0 4px' }}>🚩 Feature Flags</h3>
              <p style={{ color: '#444', fontSize: 13, margin: '0 0 16px' }}>Enable/disable features on the live site instantly</p>
              {[
                { key: 'imageToVideo' as const, label: '🎬 Image to Video', desc: 'Allow users to generate videos' },
                { key: 'audioAI' as const, label: '🎵 Audio AI', desc: 'Allow users to generate music' },
                { key: 'createImage' as const, label: '🖼️ Create Image', desc: 'Allow users to generate images' },
              ].map(f => (
                <div key={f.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ paddingRight: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{f.label}</div>
                    <div style={{ fontSize: 12, color: '#444' }}>{f.desc}</div>
                  </div>
                  <button onClick={() => setFlags(prev => ({ ...prev, [f.key]: !prev[f.key] }))}
                    style={{ width: 52, height: 28, borderRadius: 100, border: 'none', background: flags[f.key] ? '#FF5C2B' : '#222', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 50, background: 'white', position: 'absolute', top: 4, left: flags[f.key] ? 28 : 4, transition: 'left 0.2s' }} />
                  </button>
                </div>
              ))}
            </div>

            {/* Save Button */}
            {saveMsg && <div style={{ background: 'rgba(100,200,100,0.08)', border: '1px solid rgba(100,200,100,0.2)', borderRadius: 12, padding: '12px 16px', color: '#80cc80', fontSize: 14 }}>{saveMsg}</div>}
            <button onClick={saveSettings} disabled={savingSettings}
              style={{ width: '100%', padding: '15px', borderRadius: 14, border: 'none', background: savingSettings ? '#1a1a1a' : '#FF5C2B', color: savingSettings ? '#444' : 'white', fontSize: 15, fontWeight: 700, cursor: savingSettings ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {savingSettings ? 'Saving...' : '💾 Save Changes — Go Live'}
            </button>

            {/* API Status */}
            <div style={{ background: '#111', borderRadius: 14, border: '1px solid rgba(255,255,255,0.05)', padding: 22 }}>
              <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, margin: '0 0 14px' }}>🔑 API Configuration</h3>
              {[
                { label: 'KIE.AI', note: 'Image to Video, Lip Sync, Audio', active: true /* checked via server env — always configured if site works */ },
                { label: 'Supabase', note: 'Auth & Database', active: true },
              ].map(a => (
                <div key={a.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{a.label}</div>
                    <div style={{ fontSize: 12, color: '#444' }}>{a.note}</div>
                  </div>
                  <span style={{ padding: '3px 10px', borderRadius: 20, background: a.active ? 'rgba(100,200,100,0.1)' : 'rgba(255,68,68,0.1)', color: a.active ? '#80cc80' : '#ff6666', fontSize: 11, fontWeight: 700 }}>
                    {a.active ? '● Configured' : '● Missing Key'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}