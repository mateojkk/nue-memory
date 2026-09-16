'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { NueLogo } from './NueLogo';
import { ThemeToggle } from './ThemeToggle';
import { AuthButton } from './auth/AuthButton';

interface NueNavbarProps {}

/**
 * Landing navbar. The landing lives at /landing; the working app at
 * /mediamemory (which is also where / redirects). All navigation is
 * route-based — no client view switching.
 */
export function NueNavbar({}: NueNavbarProps = {}) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-50 bg-[var(--bg)]/80 backdrop-blur-[13px] border-b border-[var(--border)] px-3 sm:px-6 py-2.5 sm:py-3.5 font-light transition-colors">
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

        {/* Right Controls: Auth, GitHub, and Motion Studio CTA */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <AuthButton />

          {/* Primary CTA: Launch Motion */}
          <button
            onClick={() => router.push('/motion')}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[var(--accent-deep)] hover:bg-[var(--accent)] text-[#4a2c0e] text-xs font-medium hover:scale-105 active:scale-95 transition-all duration-200 shadow-sm"
          >
            <span className="hidden xs:inline">Launch Studio</span>
            <span className="xs:hidden">Studio</span>
            <ArrowRight className="w-3.5 h-3.5 text-[var(--accent)]" />
          </button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
