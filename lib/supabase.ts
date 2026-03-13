import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Auto-clear invalid refresh tokens globally
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'TOKEN_REFRESHED' && !session) {
      supabase.auth.signOut();
    }
  });

  return supabase;
}
