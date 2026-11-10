import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  themeColor: '#09090b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: 'AnyFetch — Universal Media Downloader | Highest Permitted Quality',
  description:
    'Download supported videos, photos, and media from YouTube, Instagram, Pinterest, TikTok, X, Reddit, Threads, and direct media URLs in original master quality.',
  keywords: [
    'media downloader',
    'video downloader',
    'youtube shorts download',
    'instagram reels download',
    'reddit video download',
    'pinterest image download',
    'twitter video download',
    'high quality media downloader',
  ],
  authors: [{ name: 'AnyFetch Engineering' }],
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
