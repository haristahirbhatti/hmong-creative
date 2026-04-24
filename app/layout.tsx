import type { Metadata } from 'next';
import './globals.css';
import MaintenanceGuard from './components/MaintenanceGuard';
import { createClient } from '@supabase/supabase-js';
import { BODY_FONTS, HEADING_FONTS } from '../lib/fonts';

export const metadata: Metadata = {
  title: 'Hmong Creative — AI Studio',
  description: 'AI-powered creative tools for everyone',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let bodyFontName = 'DM Sans';
  let headingFontName = 'Syne';

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['site_body_font', 'site_heading_font']);
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((r: { key: string; value: string }) => { map[r.key] = r.value; });
      if (map.site_body_font    && BODY_FONTS[map.site_body_font])       bodyFontName    = map.site_body_font;
      if (map.site_heading_font && HEADING_FONTS[map.site_heading_font]) headingFontName = map.site_heading_font;
    }
  } catch { /* use defaults on error */ }

  const bodyFont    = BODY_FONTS[bodyFontName];
  const headingFont = HEADING_FONTS[headingFontName];
  const fontsUrl    = `https://fonts.googleapis.com/css2?family=${bodyFont.param}&family=${headingFont.param}&display=swap`;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href={fontsUrl} rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --font-heading: ${headingFont.family};
            --font-body:    ${bodyFont.family};
          }
          * { font-stretch: normal !important; box-sizing: border-box; }
          body {
            font-family: var(--font-body);
            -webkit-font-smoothing: antialiased;
            margin: 0;
          }
        ` }} />
      </head>
      <body suppressHydrationWarning>
        <MaintenanceGuard>
          {children}
        </MaintenanceGuard>
      </body>
    </html>
  );
}
