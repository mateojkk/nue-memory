import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '500'],
  display: 'swap',
  variable: '--font-inter',
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
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} min-h-screen bg-[#0c0a09] text-stone-200 font-light antialiased selection:bg-[#c88d51]/20 selection:text-white`}>
        {children}
      </body>
    </html>
  );
}
