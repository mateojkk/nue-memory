'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { NueLogo } from './NueLogo';
import { ThemeToggle } from './ThemeToggle';

interface NueNavbarProps {}

/**
 * Landing navbar. The landing lives at /landing; the working app at
 * /mediamemory (which is also where / redirects). All navigation is
 * route-based - no client view switching.
 */
export function NueNavbar({}: NueNavbarProps = {}) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-50 bg-[var(--bg)]/80 backdrop-blur-[13px] shadow-xs px-3 sm:px-6 py-2.5 sm:py-3.5 font-light transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand: Technical asterisk icon + Nue mark */}
        <div className="flex items-center gap-3 sm:gap-6">
          <button
            onClick={() => router.push('/landing')}
            className="flex items-center text-left group shrink-0"
          >
            <NueLogo size={18} showText={true} textSize="text-base sm:text-lg" />
          </button>

          {/* Minimal Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-[13px] font-medium text-[var(--fg-muted)]">
            <a href="/#product" className="hover:text-[var(--fg)] transition">
              Product
            </a>
            <a href="/#developers" className="hover:text-[var(--fg)] transition">
              Developers
            </a>
            <a href="/#docs" className="hover:text-[var(--fg)] transition">
              Docs
            </a>
          </nav>
        </div>

        {/* Right Controls: Theme Toggle and User Status */}
        <div className="flex items-center gap-2.5">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
