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
  title: 'Nue · Media Memory',
  description:
    'Nue is a company founded by NextMathLabs. Media Memory is the first feature shipped under Nue, providing decentralized persistent creative preferences for Livepeer Agent via Walrus MemWal.',
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

