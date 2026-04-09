import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';

const geist = Geist({ variable: '--font-geist', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Wieloszki — Panel domowy',
  description: 'Panel zarządzania gospodarstwem domowym',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Wieloszki',
  },
  icons: {
    icon: '/boar.svg',
    apple: '/boar.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className={`${geist.variable} h-full`} style={{ colorScheme: 'light' }}>
      <body className="min-h-full flex bg-zinc-50 antialiased font-sans">
        <Sidebar />
        <main className="flex-1 overflow-auto pt-14 md:pt-0 pb-16 md:pb-0 min-w-0">
          {children}
        </main>
      </body>
    </html>
  );
}
