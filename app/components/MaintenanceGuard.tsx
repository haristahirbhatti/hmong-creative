'use client';

import { useSiteSettings } from '../../lib/useSiteSettings';

export default function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const { settings, loading } = useSiteSettings();

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans',sans-serif", color: '#444' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>✦</div>
        <p>Loading...</p>
      </div>
    </div>
  );

  if (settings.maintenance_mode) return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans',sans-serif", color: 'white', padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 56, marginBottom: 24 }}>🔧</div>
      <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 'clamp(28px,5vw,48px)', marginBottom: 16, letterSpacing: -1 }}>Under Maintenance</h1>
      <p style={{ color: '#555', fontSize: 16, maxWidth: 400, lineHeight: 1.6 }}>
        We are currently performing some updates. Please check back soon!
      </p>
      <div style={{ marginTop: 32, padding: '12px 24px', borderRadius: 100, border: '1px solid rgba(255,255,255,0.1)', color: '#444', fontSize: 14 }}>
        {settings.site_name} Team
      </div>
    </div>
  );

  return <>{children}</>;
}
