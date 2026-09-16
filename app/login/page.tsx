'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, ArrowLeft, Mail, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { NueLogo } from '@/components/NueLogo';
import { useAuth } from '@/components/auth/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const { authenticated, loginWithMagic, email: currentEmail } = useAuth();
  const [inputEmail, setInputEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If already authenticated, redirect to Nue Motion workspace
  if (authenticated) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] flex flex-col items-center justify-center p-6 relative font-light">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[var(--accent)]/15 pointer-events-none rounded-full blur-3xl" />
        <div className="w-full max-w-md rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-8 text-center space-y-5 shadow-2xl animate-fadeIn">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-medium tracking-tight text-[var(--fg)] font-sans">
              Welcome back
            </h2>
            <p className="text-xs text-[var(--fg-muted)] font-mono">
              Signed in as <span className="text-[var(--fg)] font-medium">{currentEmail}</span>
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-xs font-mono flex items-center justify-between">
            <span className="text-[var(--fg-muted)]">Nue Motion Balance</span>
            <span className="text-emerald-400 font-semibold">$10.00 Grant Active</span>
          </div>

          <button
            onClick={() => router.push('/mediamemory')}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[var(--accent-deep)] hover:bg-[var(--accent)] text-[#4a2c0e] text-xs font-medium hover:scale-105 active:scale-95 transition-all duration-200 shadow-md"
          >
            <span>Enter Nue Motion Studio</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputEmail.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await loginWithMagic(inputEmail.trim());
      setIsLoading(false);
      router.push('/mediamemory');
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || 'Magic authentication failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] flex flex-col justify-between p-6 relative font-light overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-[var(--accent)]/15 pointer-events-none rounded-full blur-3xl" />

      {/* Top Header Affordance */}
      <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] transition hover:-translate-x-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Nue</span>
        </button>

        <button
          onClick={() => router.push('/')}
          className="flex items-center group hover:opacity-85 transition"
        >
          <NueLogo size={20} showText={true} textSize="text-base" />
        </button>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md mx-auto my-auto py-8">
        <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl p-7 sm:p-9 space-y-6 relative animate-fadeIn">
          {/* Badge */}
          <div className="flex items-center justify-between pb-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-mono font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Complimentary $10 Grant</span>
            </div>
            <span className="text-[11px] font-mono text-[var(--fg-faint)]">Nue Motion</span>
          </div>

          {/* Titles */}
          <div className="space-y-1.5 text-left">
            <h1 className="text-2xl sm:text-[26px] font-medium text-[var(--fg)] tracking-tight font-sans">
              Sign in with Magic
            </h1>
            <p className="text-xs sm:text-sm text-[var(--fg-muted)] leading-relaxed font-light">
              Enter your email address to receive an authentic Magic link and activate your $10 Livepeer generation grant.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-900/50 text-xs text-red-400 flex items-start gap-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-1.5 text-left">
              <label className="text-[11px] font-mono uppercase tracking-wider text-[var(--fg-muted)] block">
                Email address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[var(--fg-faint)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={inputEmail}
                  onChange={(e) => setInputEmail(e.target.value)}
                  placeholder="name@company.com"
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-xs text-[var(--fg)] placeholder:text-[var(--fg-faint)] font-mono focus:outline-none focus:border-[var(--accent)] transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[var(--accent-deep)] hover:bg-[var(--accent)] text-[#4a2c0e] text-xs sm:text-sm font-medium hover:scale-[1.01] active:scale-95 transition-all duration-200 shadow-md disabled:opacity-50"
            >
              <span>{isLoading ? 'Sending Magic Link...' : 'Continue with Magic Link'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Security & Benefits footer */}
          <div className="pt-4 border-t border-[var(--border)]/60 grid grid-cols-2 gap-3 text-[11px] font-mono text-[var(--fg-faint)] text-left">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Magic Labs Auth</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>$10 Livepeer credits</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer copyright */}
      <div className="max-w-7xl w-full mx-auto text-center text-xs text-[var(--fg-faint)] font-mono">
        Nue Memory · Continuous Agent Context Layer
      </div>
    </div>
  );
}
