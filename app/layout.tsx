import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hmong Creative Media Studio',
  description: 'Where Culture Meets Creation — AI-powered audio, video, and image generation.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
