import type { Metadata } from 'next';
import { Fustat, Fragment_Mono, EB_Garamond } from 'next/font/google';
import './globals.css';

// mem0.ai exact font stack
const fustat = Fustat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-fustat',
});

const fragmentMono = Fragment_Mono({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--font-fragment',
});

const ebGaramond = EB_Garamond({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-garamond',
});

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fustat.variable} ${fragmentMono.variable} ${ebGaramond.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('nue-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className={`${fustat.className} min-h-screen bg-[var(--bg)] text-[var(--fg)] antialiased selection:bg-[var(--accent)]/20 selection:text-[var(--fg)]`}>
        {children}
      </body>
    </html>
  );
}
