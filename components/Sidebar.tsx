'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { useState } from 'react';

const primaryNav = [
  { href: '/', label: 'Dom', icon: '🏠' },
  { href: '/obiady', label: 'Obiady', icon: '🍽️' },
  { href: '/zakupy', label: 'Zakupy', icon: '🛒' },
  { href: '/spizarnia', label: 'Spiżarnia', icon: '📦' },
  { href: '/budzet', label: 'Budżet', icon: '💰' },
  { href: '/kalendarz', label: 'Kalendarz', icon: '📅' },
  { href: '/agent', label: 'Agent', icon: '🤖' },
];

const secondaryNav = [
  { href: '/czat', label: 'Czat', icon: '💬' },
  { href: '/notatki', label: 'Notatki', icon: '📝' },
  { href: '/kontakty', label: 'Kontakty', icon: '📞' },
  { href: '/statystyki', label: 'Statystyki', icon: '📊' },
];

const allNav = [...primaryNav, ...secondaryNav];
const mobileNav = primaryNav; // 7 głównych w bottom nav

export default function Sidebar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

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
          {primaryNav.map(({ href, label, icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-emerald-500 text-white' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'}`}
              >
                <span className="text-base">{icon}</span>
                {label}
              </Link>
            );
          })}
          <div className="my-2 border-t border-zinc-100" />
          {secondaryNav.map(({ href, label, icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-emerald-500 text-white' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'}`}
              >
                <span className="text-base">{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="px-5 py-4 border-t border-zinc-100">
          <p className="text-xs text-zinc-400">Adrian & Kasia</p>
          <p className="text-xs text-zinc-300 mt-0.5">v0.2</p>
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-zinc-200 h-14 flex items-center px-4 gap-3">
        <Image src="/boar.svg" alt="Loszki" width={32} height={32} className="rounded-lg" />
        <span className="text-zinc-900 font-bold text-base tracking-tight">Loszki</span>
      </header>

      {/* ── Mobile bottom nav (7 primary + Więcej) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-zinc-200 flex safe-area-inset-bottom">
        {mobileNav.map(({ href, label, icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${active ? 'text-emerald-500' : 'text-zinc-400 active:text-zinc-600'}`}
            >
              <span className="text-xl leading-none">{icon}</span>
              <span className="text-[9px] font-medium">{label}</span>
            </Link>
          );
        })}
        {/* Więcej */}
        <button
          onClick={() => setMoreOpen(true)}
          className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${secondaryNav.some(n => n.href === pathname) ? 'text-emerald-500' : 'text-zinc-400'}`}
        >
          <span className="text-xl leading-none">⋯</span>
          <span className="text-[9px] font-medium">Więcej</span>
        </button>
      </nav>

      {/* ── Mobile "Więcej" overlay ── */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-[60] flex items-end" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full bg-white rounded-t-2xl p-4 pb-8"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-zinc-200 rounded-full mx-auto mb-4" />
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3 px-2">Więcej</p>
            <div className="grid grid-cols-4 gap-2">
              {secondaryNav.map(({ href, label, icon }) => {
                const active = pathname === href;
                return (
                  <Link key={href} href={href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl text-center transition-colors ${active ? 'bg-emerald-50 text-emerald-600' : 'hover:bg-zinc-50 text-zinc-600'}`}
                  >
                    <span className="text-2xl">{icon}</span>
                    <span className="text-xs font-medium">{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
