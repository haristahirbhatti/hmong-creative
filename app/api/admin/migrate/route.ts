import { NextRequest, NextResponse } from 'next/server';

// One-time migration: add missing columns to DB
// GET /api/admin/migrate?secret=migrate123
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== 'migrate123') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // Use Supabase's PostgREST schema reload endpoint
  // We'll achieve migrations by trying inserts and checking column existence
  const results: Record<string, unknown> = {};

  // Use direct SQL via Supabase's REST API with service role
  const runSQL = async (sql: string) => {
    // Supabase supports raw SQL via their postgres functions
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/run_migration`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql }),
    });
    const text = await res.text();
    return { status: res.status, body: text };
  };

  // Alternative: use Supabase management API to run queries
  // Extract project ref from URL
  const projectRef = supabaseUrl.split('//')[1].split('.')[0];

  const runMgmtSQL = async (sql: string) => {
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });
    const text = await res.text();
    return { status: res.status, body: text };
  };

  results.add_images_generated = await runMgmtSQL(
    'ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS images_generated integer DEFAULT 0;'
  );
  results.add_audio_generated = await runMgmtSQL(
    'ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS audio_generated integer DEFAULT 0;'
  );
  results.add_email_to_videos = await runMgmtSQL(
    'ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS email text;'
  );

  return NextResponse.json(results);
}
