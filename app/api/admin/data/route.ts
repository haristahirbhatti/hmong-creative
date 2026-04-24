import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();

    const supabaseSession = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      }
    );

    const { data: { user } } = await supabaseSession.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
      .split(',').map(e => e.trim()).filter(Boolean);
    if (adminEmails.length > 0 && !adminEmails.includes(user.email || '')) {
      return NextResponse.json({ error: 'Forbidden. Admins only.' }, { status: 403 });
    }

    const serviceClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Fetch profiles — confirmed-existing columns (no full_name in schema)
    const { data: profiles, error: profileErr } = await serviceClient
      .from('profiles')
      .select('id, email, role, is_banned, videos_generated, images_generated, audio_generated, last_seen, created_at')
      .order('created_at', { ascending: false });

    if (profileErr) {
      console.error('Profiles fetch error:', profileErr.message);
      throw profileErr;
    }

    // Fetch generations — include type column
    const { data: gens, error: genErr } = await serviceClient
      .from('videos')
      .select('id, user_id, prompt, video_url, type, created_at')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (genErr) {
      console.error('Generations fetch error:', genErr.message);
      throw genErr;
    }

    // Build email lookup map from profiles
    const emailByUserId: Record<string, string> = {};
    for (const p of (profiles || [])) {
      if (p.id && p.email) emailByUserId[p.id] = p.email;
    }

    // Use profile columns directly — they are the source of truth for counts.
    // The videos table is only used for the Gen History list.
    const enrichedProfiles = (profiles || []).map((p: any) => ({
      ...p,
      videos_generated: p.videos_generated || 0,
      images_generated: p.images_generated || 0,
      audio_generated:  p.audio_generated  || 0,
    }));

    // Format generations to match the expected admin page shape
    const formattedGens = (gens || []).map((gen: any) => ({
      id:         gen.id,
      user_id:    gen.user_id,
      type:       gen.type || 'video', // use actual type from DB
      prompt:     gen.prompt,
      result_url: gen.video_url, // map video_url -> result_url for UI
      created_at: gen.created_at,
      email:      emailByUserId[gen.user_id] || null,
    }));

    return NextResponse.json({
      users: enrichedProfiles,
      generations: formattedGens,
    });

  } catch (error: any) {
    console.error('Admin API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
