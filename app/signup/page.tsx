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
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async () => {
    if (!name || !email || !password) { setError('Please fill all fields'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true); setError('');
    const { error: e } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name } }
    });
    if (e) { setError(e.message); setLoading(false); return; }
    setSuccess(true); setLoading(false);
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

  return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: '20px' }}>

      <Link href="/" style={{ textDecoration: 'none', marginBottom: 40, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, background: '#FF5C2B', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18, color: 'white' }}>H</div>
        <span style={{ color: 'white', fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18 }}>Hmong Creative</span>
      </Link>

      <div style={{ width: '100%', maxWidth: 420, background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '40px 36px' }}>
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 28, color: 'white', marginBottom: 8 }}>Create account</h1>
        <p style={{ color: '#666', fontSize: 14, marginBottom: 32 }}>Start creating for free today</p>

        {[
          { label: 'Full Name', val: name, set: setName, type: 'text', ph: 'Your name' },
          { label: 'Email', val: email, set: setEmail, type: 'email', ph: 'you@example.com' },
          { label: 'Password', val: password, set: setPassword, type: 'password', ph: '••••••••' },
        ].map(f => (
          <div key={f.label} style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', color: '#888', fontSize: 13, marginBottom: 8, fontWeight: 500 }}>{f.label}</label>
            <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
              style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: '#1a1a1a', color: 'white', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => (e.target.style.borderColor = '#FF5C2B')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              onKeyDown={e => e.key === 'Enter' && handleSignup()}
            />
          </div>
        ))}

        {error && <p style={{ color: '#ff4444', fontSize: 13, marginBottom: 16, background: 'rgba(255,68,68,0.1)', padding: '10px 14px', borderRadius: 8 }}>{error}</p>}

        <button onClick={handleSignup} disabled={loading}
          style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: loading ? '#333' : '#FF5C2B', color: 'white', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', marginTop: 8, fontFamily: 'inherit' }}>
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