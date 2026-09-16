'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Sparkles, ChevronDown } from 'lucide-react';
import { useAuth } from './useAuth';

interface AuthButtonProps {
  creditBalance?: number;
  className?: string;
}

export function AuthButton({ creditBalance = 10.0, className = '' }: AuthButtonProps) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { authenticated, email, login, logout } = useAuth();

  if (!authenticated) {
    return (
      <button
        onClick={() => router ? router.push('/login') : login()}
        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--accent-deep)] hover:bg-[var(--accent)] text-[#4a2c0e] text-xs font-medium hover:scale-105 active:scale-95 transition-all duration-200 shadow-sm ${className}`}
      >
        <Sparkles className="w-3.5 h-3.5 text-[#4a2c0e]" />
        <span>Get $10 Credit</span>
      </button>
    );
  }

  const userEmail = email || 'creator@nue.ai';

  return (
    <div className="relative">
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-2)] border border-[var(--border)] text-xs font-mono transition-all duration-200"
      >
        <div className="w-5 h-5 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] flex items-center justify-center font-bold text-[10px]">
          {userEmail[0].toUpperCase()}
        </div>
        <span className="text-[var(--fg)] max-w-[120px] truncate">{userEmail}</span>
        <span className="text-emerald-500 font-medium">${creditBalance.toFixed(2)}</span>
        <ChevronDown className="w-3 h-3 text-[var(--fg-muted)]" />
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-xl p-2 z-50 animate-fadeIn text-xs font-light">
          <div className="p-2.5 border-b border-[var(--border)] mb-1">
            <span className="text-[10px] uppercase font-mono text-[var(--fg-faint)] block">Signed in as</span>
            <span className="text-[var(--fg)] font-medium truncate block mt-0.5">{userEmail}</span>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--border)]/50 text-[11px] font-mono">
              <span className="text-[var(--fg-muted)]">Nue Motion Balance</span>
              <span className="text-emerald-400 font-semibold">${creditBalance.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={() => {
              logout();
              setDropdownOpen(false);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-red-400 hover:bg-red-950/30 transition text-left"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
}
