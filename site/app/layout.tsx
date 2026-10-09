import { Analytics } from '@vercel/analytics/next';
import type { Metadata, Viewport } from 'next';
import { Fredoka } from 'next/font/google';
import type { ReactNode } from 'react';
import { MotionProvider } from '@/components/ui/motion-provider';
import { SITE } from '@/lib/site';
import './globals.css';

const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-fredoka',
  display: 'swap',
});

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#faf9ff',
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: SITE.title,
  description: SITE.description,
  applicationName: SITE.name,
  authors: [{ name: SITE.author, url: 'https://github.com/Avijit07x' }],
  creator: SITE.author,
  keywords: ['CursorCam', 'Claude Code', 'demo video', 'product demo', 'auto zoom', 'mp4'],
  openGraph: {
    type: 'website',
    url: SITE.url,
    siteName: SITE.name,
    title: SITE.title,
    description: SITE.description,
    locale: 'en_US',
    images: [
      { url: '/og.png', width: 1200, height: 630, alt: 'CursorCam: ask Claude for a demo video' },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE.title,
    description: SITE.description,
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={fredoka.variable}>
      <body className="min-h-dvh bg-page font-sans text-ink antialiased">
        <MotionProvider>{children}</MotionProvider>
        <Analytics />
      </body>
    </html>
  );
}
