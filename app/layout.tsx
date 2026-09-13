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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} min-h-screen bg-[#faf8f5] text-[#18120e] font-light antialiased selection:bg-[#eed8c2] selection:text-[#18120e]`}>
        {children}
      </body>
    </html>
  );
}

