import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nue Memory · Media Memory',
  description:
    'Nue Memory is a company founded by NextMathLabs. Media Memory is the first feature shipped under Nue Memory, providing decentralized persistent creative preferences for Livepeer Agent via Walrus MemWal.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-black text-[#f5f2eb] antialiased selection:bg-[#c88d51]/30 selection:text-[#fbf7ee]">
        {children}
      </body>
    </html>
  );
}
