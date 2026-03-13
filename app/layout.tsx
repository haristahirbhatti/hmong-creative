import type { Metadata } from 'next';
import './globals.css';
import MaintenanceGuard from './components/MaintenanceGuard';

export const metadata: Metadata = {
  title: 'Hmong Creative — AI Studio',
  description: 'AI-powered creative tools for everyone',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Load both fonts in a single request for speed */}
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap"
          rel="stylesheet"
        />
        <style dangerouslySetInnerHTML={{ __html: `
          /* Immediate fallback - prevents layout shift and stretch */
          :root {
            --font-heading: 'Syne', 'Futura', 'Century Gothic', 'Trebuchet MS', system-ui, sans-serif;
            --font-body: 'DM Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          }
          * { font-stretch: normal !important; box-sizing: border-box; }
          body { 
            font-family: var(--font-body);
            -webkit-font-smoothing: antialiased;
            margin: 0;
          }
        ` }} />
      </head>
      <body>
        <MaintenanceGuard>
          {children}
        </MaintenanceGuard>
      </body>
    </html>
  );
}
