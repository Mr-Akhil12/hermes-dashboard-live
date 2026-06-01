// src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';

export const metadata: Metadata = {
  title: 'Hermes OS — Mission Control',
  description: 'Hermes Agent mission control dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0a0a0f] text-zinc-100 antialiased">
        <Sidebar />
        <TopBar />
        <main>{children}</main>
      </body>
    </html>
  );
}
