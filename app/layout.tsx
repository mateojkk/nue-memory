import type { Metadata } from 'next';
// Fonts are vendored via @fontsource (no build-time Google Fonts fetch —
// a flaky CDN must never be able to break a build).
import '@fontsource/fustat/400.css';
import '@fontsource/fustat/500.css';
import '@fontsource/fustat/600.css';
import '@fontsource/fustat/700.css';
import '@fontsource/fragment-mono/400.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nue · The Memory Infrastructure Layer for AI Agents',
  description:
    'Nue is the memory infrastructure layer for AI agents, giving agents persistent memory to retain what matters, learn from previous interactions, and evolve context over time with durable Walrus storage.',
  icons: {
    icon: '/logo.jpg',
    shortcut: '/favicon.ico',
    apple: '/logo.jpg',
  },
};

import { PrivyWrapper } from '@/components/auth/PrivyWrapper';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('nue-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-screen bg-[var(--bg)] text-[var(--fg)] antialiased selection:bg-[var(--accent)]/20 selection:text-[var(--fg)]">
        <PrivyWrapper>{children}</PrivyWrapper>
      </body>
    </html>
  );
}
