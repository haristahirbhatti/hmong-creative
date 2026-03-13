'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed]     = useState(false);
  const router   = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const check = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();

        // Invalid/expired refresh token — clear session and redirect to login
        if (error || !user) {
          await supabase.auth.signOut();
          router.push('/login?redirect=' + encodeURIComponent(window.location.pathname));
          return;
        }

        setAuthed(true);
      } catch {
        await supabase.auth.signOut();
        router.push('/login');
      } finally {
        setChecking(false);
      }
    };
    check();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (checking) return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans',sans-serif", color: '#444' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>✦</div>
        <p>Loading...</p>
      </div>
    </div>
  );

  if (!authed) return null;
  return <>{children}</>;
}
