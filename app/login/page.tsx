'use client';

import { useState } from 'react';
import { createClient } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async () => {
    setLoading(true); setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    router.push('/dashboard');
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${location.origin}/dashboard` } });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: '20px' }}>
      
      {/* Logo */}
      <Link href="/" style={{ textDecoration: 'none', marginBottom: 40, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, background: '#FF5C2B', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18, color: 'white' }}>H</div>
        <span style={{ color: 'white', fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18 }}>Hmong Creative</span>
      </Link>

      {/* Card */}
      <div style={{ width: '100%', maxWidth: 420, background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '40px 36px' }}>
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 28, color: 'white', marginBottom: 8 }}>Welcome back</h1>
        <p style={{ color: '#666', fontSize: 14, marginBottom: 32 }}>Sign in to your account</p>

        {/* Google */}
        <button onClick={handleGoogle} style={{ width: '100%', padding: '13px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 24, transition: 'border-color 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#FF5C2B')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ color: '#444', fontSize: 12 }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
        </div>

        {/* Email */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', color: '#888', fontSize: 13, marginBottom: 8, fontWeight: 500 }}>Email</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: '#1a1a1a', color: 'white', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => (e.target.style.borderColor = '#FF5C2B')}
            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
          />
        </div>

        {/* Password */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <label style={{ color: '#888', fontSize: 13, fontWeight: 500 }}>Password</label>
            <a href="#" style={{ color: '#FF5C2B', fontSize: 13, textDecoration: 'none' }}>Forgot?</a>
          </div>
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: '#1a1a1a', color: 'white', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => (e.target.style.borderColor = '#FF5C2B')}
            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
        </div>

        {error && <p style={{ color: '#ff4444', fontSize: 13, marginBottom: 16, background: 'rgba(255,68,68,0.1)', padding: '10px 14px', borderRadius: 8 }}>{error}</p>}

        <button onClick={handleLogin} disabled={loading} style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: loading ? '#333' : '#FF5C2B', color: 'white', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}>
          {loading ? 'Signing in...' : 'Sign In →'}
        </button>

        <p style={{ textAlign: 'center', marginTop: 24, color: '#555', fontSize: 14 }}>
          No account?{' '}
          <Link href="/signup" style={{ color: '#FF5C2B', textDecoration: 'none', fontWeight: 600 }}>Create one free</Link>
        </p>
      </div>
    </div>
  );
}
