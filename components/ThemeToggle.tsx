'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

/** Light/dark theme toggle. Light = white + very light brown. Dark = black + soft brown. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));

    const handleSync = (e: Event) => {
      const customEvt = e as CustomEvent<string>;
      if (customEvt.detail === 'dark' || customEvt.detail === 'light') {
        setIsDark(customEvt.detail === 'dark');
      }
    };

    window.addEventListener('nue-theme-sync', handleSync);
    return () => window.removeEventListener('nue-theme-sync', handleSync);
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    const themeStr = next ? 'dark' : 'light';
    try {
      localStorage.setItem('nue-theme', themeStr);
    } catch {}

    // Persist theme to database for authenticated user
    try {
      const saved = localStorage.getItem('nue_demo_user') || sessionStorage.getItem('nue_demo_user');
      let userEmail: string | null = null;
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          userEmail = parsed?.email || null;
        } catch {
          userEmail = saved;
        }
      }
      if (!userEmail) {
        userEmail = localStorage.getItem('nue_user_email');
      }

      if (userEmail) {
        fetch('/api/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail, action: 'set_theme', theme: themeStr }),
        }).catch((err) => console.warn('Theme DB save error:', err));
      }
    } catch {}
  }

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Light theme' : 'Dark theme'}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--surface-2)]/80 text-[var(--fg-muted)] hover:text-[var(--fg)] hover:scale-105 active:scale-90 transition-all duration-200 ${className}`}
    >
      {isDark === null ? (
        <span className="w-3.5 h-3.5" />
      ) : isDark ? (
        <Sun className="w-3.5 h-3.5 text-amber-300 transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon className="w-3.5 h-3.5 text-slate-400 transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  );
}
