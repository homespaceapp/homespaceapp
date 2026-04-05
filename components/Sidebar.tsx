'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

const nav = [
  { href: '/', label: 'Dom', icon: '🏠' },
  { href: '/obiady', label: 'Obiady', icon: '🍽️' },
  { href: '/zakupy', label: 'Zakupy', icon: '🛒' },
  { href: '/spizarnia', label: 'Spiżarnia', icon: '📦' },
  { href: '/budzet', label: 'Budżet', icon: '💰' },
  { href: '/agent', label: 'Agent', icon: '🤖' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-56 min-h-screen bg-white border-r border-zinc-200 text-zinc-800 flex-col shrink-0">
        <div className="px-5 py-5 border-b border-zinc-100 flex items-center gap-3">
          <Image src="/boar.svg" alt="Loszki" width={36} height={36} className="rounded-lg" />
          <div>
            <h1 className="text-base font-bold tracking-tight text-zinc-900">Loszki</h1>
            <p className="text-xs text-zinc-400">Panel domowy</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {nav.map(({ href, label, icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-emerald-500 text-white'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
              >
                <span className="text-base">{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="px-5 py-4 border-t border-zinc-100">
          <p className="text-xs text-zinc-400">Adrian & Kasia</p>
          <p className="text-xs text-zinc-300 mt-0.5">v0.1</p>
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-zinc-200 h-14 flex items-center px-4 gap-3">
        <Image src="/boar.svg" alt="Loszki" width={32} height={32} className="rounded-lg" />
        <span className="text-zinc-900 font-bold text-base tracking-tight">Loszki</span>
      </header>

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-zinc-200 flex safe-area-inset-bottom">
        {nav.map(({ href, label, icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                active ? 'text-emerald-500' : 'text-zinc-400 active:text-zinc-600'
              }`}
            >
              <span className="text-xl leading-none">{icon}</span>
              <span className="text-[9px] font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
