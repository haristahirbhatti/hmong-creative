'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { createClient } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async () => {
    if (!email || !password) { setError('Please fill all fields'); return; }
    setLoading(true); setError('');

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) { setError('Invalid credentials'); setLoading(false); return; }

    // Check if admin email
    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
    if (adminEmails.length > 0 && !adminEmails.includes(email)) {
      await supabase.auth.signOut();
      setError('Access denied — you are not an admin');
      setLoading(false);
      return;
    }

    router.push('/admin');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: 20 }}>

      <Link href="/" style={{ textDecoration: 'none', marginBottom: 40, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, background: '#FF5C2B', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18, color: 'white' }}>H</div>
        <span style={{ color: 'white', fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18 }}>Hmong Creative</span>
      </Link>

      <div style={{ width: '100%', maxWidth: 400, background: '#0f0f0f', border: '1px solid rgba(255,92,43,0.15)', borderRadius: 24, padding: '40px 36px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{ width: 40, height: 40, background: 'rgba(255,92,43,0.1)', border: '1px solid rgba(255,92,43,0.2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🔐</div>
          <div>
            <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 20, color: 'white', margin: 0 }}>Admin Access</h1>
            <p style={{ color: '#444', fontSize: 13, margin: 0 }}>Restricted area</p>
          </div>
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', marginBottom: 28 }} />

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', color: '#666', fontSize: 13, marginBottom: 8, fontWeight: 500 }}>Admin Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com"
            style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: '#1a1a1a', color: 'white', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => (e.target.style.borderColor = '#FF5C2B')}
            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', color: '#666', fontSize: 13, marginBottom: 8, fontWeight: 500 }}>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
            style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: '#1a1a1a', color: 'white', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => (e.target.style.borderColor = '#FF5C2B')}
            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
            <span>⚠️</span>
            <p style={{ color: '#ff6666', fontSize: 13, margin: 0 }}>{error}</p>
          </div>
        )}

        <button onClick={handleLogin} disabled={loading}
          style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: loading ? '#222' : '#FF5C2B', color: loading ? '#444' : 'white', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
        >
          {loading ? 'Verifying...' : '🔐 Enter Admin Panel'}
        </button>

        <p style={{ textAlign: 'center', marginTop: 24, color: '#333', fontSize: 13 }}>
          Not an admin?{' '}
          <Link href="/login" style={{ color: '#555', textDecoration: 'none' }}>Regular login →</Link>
        </p>
      </div>
    </div>
  );
}