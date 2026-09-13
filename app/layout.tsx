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
    <html lang="en">
      <body className="min-h-screen bg-[#faf8f5] text-[#18120e] antialiased selection:bg-[#eed8c2] selection:text-[#18120e]">
        {children}
      </body>
    </html>
  );
}
