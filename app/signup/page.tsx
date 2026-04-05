'use client';

import { useState } from 'react';
import { createClient } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'facebook' | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async () => {
    if (!name || !email || !password) { setError('Please fill all fields'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true); setError('');
    const { error: e } = await supabase.auth.signUp({
      email, password,
      options: { 
        data: { full_name: name },
        redirectTo: `${window.location.origin}/auth/callback?redirect=/dashboard`,
      }
    });
    if (e) { setError(e.message); setLoading(false); return; }
    setSuccess(true); setLoading(false);
  };

  const handleOAuth = async (provider: 'google' | 'facebook') => {
    setOauthLoading(provider); setError('');
    const { error: e } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=/dashboard`,
      },
    });
    if (e) { setError(e.message); setOauthLoading(null); }
  };

  if (success) return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ textAlign: 'center', color: 'white' }}>
        <div style={{ fontSize: 64, marginBottom: 24 }}>📧</div>
        <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 28, marginBottom: 12 }}>Check your email!</h2>
        <p style={{ color: '#666', fontSize: 15 }}>We sent a confirmation link to <strong style={{ color: '#FF5C2B' }}>{email}</strong></p>
        <Link href="/login" style={{ display: 'inline-block', marginTop: 32, color: '#FF5C2B', textDecoration: 'none', fontWeight: 600 }}>← Back to Login</Link>
      </div>
    </div>
  );

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 16px', borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.1)', background: '#1a1a1a',
    color: 'white', fontSize: 14, outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: '20px' }}>

      <Link href="/" style={{ textDecoration: 'none', marginBottom: 40, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, background: '#FF5C2B', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18, color: 'white' }}>H</div>
        <span style={{ color: 'white', fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18 }}>Hmong Creative</span>
      </Link>

      <div style={{ width: '100%', maxWidth: 420, background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '40px 36px' }}>
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 28, color: 'white', marginBottom: 8 }}>Create account</h1>
        <p style={{ color: '#666', fontSize: 14, marginBottom: 24 }}>Start creating for free today</p>

        {/* Google Button */}
        <button
          onClick={() => handleOAuth('google')}
          disabled={!!oauthLoading || loading}
          style={{ width: '100%', padding: '13px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: oauthLoading === 'google' ? '#1a1a1a' : '#fff', color: '#111', fontSize: 14, fontWeight: 600, cursor: oauthLoading || loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 10, transition: 'opacity 0.2s', opacity: oauthLoading === 'google' ? 0.7 : 1 }}
        >
          {oauthLoading === 'google' ? (
            <span style={{ color: '#555' }}>Redirecting...</span>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Sign up with Google
            </>
          )}
        </button>

        {/* Facebook Button */}
        <button
          onClick={() => handleOAuth('facebook')}
          disabled={!!oauthLoading || loading}
          style={{ width: '100%', padding: '13px 14px', borderRadius: 12, border: 'none', background: oauthLoading === 'facebook' ? '#1a3a6e' : '#1877F2', color: 'white', fontSize: 14, fontWeight: 600, cursor: oauthLoading || loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20, transition: 'opacity 0.2s', opacity: oauthLoading === 'facebook' ? 0.7 : 1 }}
        >
          {oauthLoading === 'facebook' ? (
            <span>Redirecting...</span>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              Sign up with Facebook
            </>
          )}
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
          <span style={{ color: '#333', fontSize: 12, fontWeight: 600, letterSpacing: 1 }}>OR</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
        </div>

        {[
          { label: 'Full Name', val: name, set: setName, type: 'text', ph: 'Your name' },
          { label: 'Email', val: email, set: setEmail, type: 'email', ph: 'you@example.com' },
          { label: 'Password', val: password, set: setPassword, type: 'password', ph: '••••••••' },
        ].map(f => (
          <div key={f.label} style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', color: '#888', fontSize: 13, marginBottom: 8, fontWeight: 500 }}>{f.label}</label>
            <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = '#FF5C2B')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              onKeyDown={e => e.key === 'Enter' && handleSignup()}
            />
          </div>
        ))}

        {error && <p style={{ color: '#ff4444', fontSize: 13, marginBottom: 16, background: 'rgba(255,68,68,0.1)', padding: '10px 14px', borderRadius: 8 }}>⚠️ {error}</p>}

        <button onClick={handleSignup} disabled={loading || !!oauthLoading}
          style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: loading ? '#333' : '#FF5C2B', color: 'white', fontSize: 15, fontWeight: 700, cursor: loading || oauthLoading ? 'not-allowed' : 'pointer', marginTop: 8, fontFamily: 'inherit' }}>
          {loading ? 'Creating account...' : 'Create Account →'}
        </button>

        <p style={{ textAlign: 'center', marginTop: 24, color: '#555', fontSize: 14 }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#FF5C2B', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}