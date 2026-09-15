'use client';

import React from 'react';
import { ArrowRight, Database } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { NueLogo } from './NueLogo';
import { ThemeToggle } from './ThemeToggle';

interface NueNavbarProps {
  onOpenVault?: () => void;
  activeCount?: number;
}

/**
 * Landing navbar. The landing lives at /landing; the working app at
 * /mediamemory (which is also where / redirects). All navigation is
 * route-based — no client view switching.
 */
export function NueNavbar({
  onOpenVault,
  activeCount = 0,
}: NueNavbarProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-50 bg-[var(--bg)]/80 backdrop-blur-[13px] border-b border-[var(--border)] px-6 py-3.5 font-light transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand: Technical asterisk icon + Nue mark */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => router.push('/landing')}
            className="flex items-center text-left group"
          >
            <NueLogo size={28} showText={true} textSize="text-xl" />
          </button>

          {/* Minimal Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-[13px] font-medium text-[var(--fg-muted)]">
            <a href="/#product" className="hover:text-[var(--fg)] transition">
              Product
            </a>
            <a href="/mediamemory" className="hover:text-[var(--fg)] transition">
              Media Memory
            </a>
            <a href="/#developers" className="hover:text-[var(--fg)] transition">
              Developers
            </a>
            <a href="/#docs" className="hover:text-[var(--fg)] transition">
              Docs
            </a>
          </nav>
        </div>

        {/* Right Controls: GitHub, Memory Vault, and Get Started */}
        <div className="flex items-center gap-3">
          {/* GitHub Link */}
          <a
            href="https://github.com/NextMathLabs"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] text-xs font-medium text-[var(--fg-soft)] hover:text-[var(--fg)] transition"
          >
            <svg className="w-3.5 h-3.5 text-[var(--fg-muted)] fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span>GitHub</span>
          </a>

          {/* Memory Vault Drawer Trigger */}
          {onOpenVault && (
            <button
              onClick={onOpenVault}
              className="px-3 py-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/50 text-xs font-medium text-[var(--fg-soft)] hover:text-[var(--fg)] flex items-center gap-1.5 transition"
              title="Inspect Memory Vault"
            >
              <Database className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span className="hidden sm:inline">Vault</span>
              {activeCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[var(--accent)] text-white text-[9px] font-medium flex items-center justify-center">
                  {activeCount}
                </span>
              )}
            </button>
          )}

          {/* Primary CTA: Rectangular Get Started button */}
          <button
            onClick={() => router.push('/mediamemory')}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-[var(--accent-deep)] hover:bg-[var(--accent)] text-white text-xs font-medium transition shadow-sm"
          >
            <span>Get started</span>
            <ArrowRight className="w-3.5 h-3.5 text-white" />
          </button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
