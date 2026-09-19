'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, ShieldCheck, Mail, ArrowLeft } from 'lucide-react';
import { NueLogo } from '@/components/NueLogo';

interface AuthGuardModalProps {
  isOpen: boolean;
  onLogin?: () => void;
}

export function AuthGuardModal({ isOpen }: AuthGuardModalProps) {
  const router = useRouter();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md rounded-2xl bg-[var(--surface)] shadow-2xl p-6 sm:p-8 space-y-6 text-center">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-[var(--accent)]/20 pointer-events-none rounded-full blur-2xl" />

        <div className="flex flex-col items-center space-y-3">
          <NueLogo size={24} showText={true} textSize="text-xl" />
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-mono font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Nue Motion Exclusive Grant</span>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-medium text-[var(--fg)] tracking-tight font-sans">
            Sign in to start directing video
          </h2>
          <p className="text-xs sm:text-sm text-[var(--fg-muted)] leading-relaxed font-light">
            Every new account gets <span className="text-emerald-400 font-medium">$10 in free video generation credits</span> with continuous style memory across projects.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <button
            onClick={() => router.push('/login')}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[var(--accent-deep)] hover:bg-[var(--accent)] text-[#4a2c0e] text-xs sm:text-sm font-medium hover:scale-[1.02] active:scale-95 transition-all duration-200 shadow-md"
          >
            <Mail className="w-4 h-4" />
            <span>Sign in with Magic Link · Claim $10</span>
          </button>

          <button
            onClick={() => router.push('/')}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-2)] transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Landing Page</span>
          </button>
        </div>

        <div className="pt-3 text-[11px] text-[var(--fg-faint)] flex items-center justify-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Passwordless Magic Link · Powered by Magic Labs</span>
        </div>
      </div>
    </div>
  );
}
