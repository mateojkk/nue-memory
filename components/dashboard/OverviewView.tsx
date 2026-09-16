'use client';

import React, { useState } from 'react';
import {
  CreditCard,
  RotateCcw,
  Zap,
  ArrowRight,
  ShieldCheck,
  Plus,
} from 'lucide-react';
import { MediaVersion } from '@/lib/types';
import { useSystemHealth, connectionIndicator } from '@/lib/hooks/useSystemHealth';

import { useAuth } from '@/components/auth/useAuth';

interface UsageViewProps {
  versions?: MediaVersion[];
  onOpenStudio?: () => void;
}

export function UsageView({ versions = [], onOpenStudio }: UsageViewProps) {
  const { health, isLoading } = useSystemHealth();
  const { email, creditBalance, topupCredits } = useAuth();
  const [isToppingUp, setIsToppingUp] = useState(false);

  // User-specific compute usage calculation
  const totalGenerations = versions.length;
  const costPerGen = 0.05;
  const computeSpent = Number((totalGenerations * costPerGen).toFixed(2));
  const remainingCredit = Number(creditBalance.toFixed(2));
  const totalGrant = Math.max(10.0, Number((remainingCredit + computeSpent).toFixed(2)));
  const percentageUsed = Math.min(100, Math.round((computeSpent / totalGrant) * 100));

  const handleTopup = async () => {
    setIsToppingUp(true);
    try {
      await topupCredits(5.0);
    } finally {
      setIsToppingUp(false);
    }
  };

  const livepeer = connectionIndicator(health.livepeer.state, isLoading);

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-light text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border)]">
        <div>
          <h2 className="text-2xl sm:text-3xl font-medium text-[var(--fg)] tracking-tight font-sans">
            Credits &amp; Usage
          </h2>
          <p className="text-[var(--fg-muted)] text-xs sm:text-sm mt-1">
            Monitor your Livepeer AI media generation credits and compute balance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {email && (
            <span className="text-xs font-mono text-[var(--fg-muted)] px-3 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
              Account: <span className="text-[var(--fg)] font-medium">{email}</span>
            </span>
          )}
          <button
            onClick={handleTopup}
            disabled={isToppingUp}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--accent-deep)] hover:bg-[var(--accent)] text-[#4a2c0e] text-xs font-medium hover:scale-105 active:scale-95 transition-all duration-200 shadow-sm self-start sm:self-auto disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isToppingUp ? 'Updating...' : 'Top-up Credit (+$5.00)'}</span>
          </button>
        </div>
      </div>

      {/* Main Credit Balance Card */}
      <div className="interactive-card p-6 sm:p-8 rounded-2xl bg-[var(--surface)] border border-[var(--border)]/60 shadow-xl space-y-6 animate-fadeIn">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-mono uppercase tracking-wider text-[var(--fg-muted)]">
              Available Credit Balance
            </span>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl sm:text-5xl font-semibold text-[var(--fg)] font-mono">
                ${remainingCredit.toFixed(2)}
              </span>
              <span className="text-sm font-mono text-[var(--fg-muted)]">
                / ${totalGrant.toFixed(2)} USD
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--surface-2)] text-xs font-mono shadow-xs">
            <span className={livepeer.dotClass} />
            <span className="text-[var(--fg-soft)]">
              {health.livepeer.state === 'configured' ? 'Livepeer API Connected' : 'Free Demo Tier Active'}
            </span>
          </div>
        </div>

        {/* Usage Progress Bar */}
        <div className="space-y-2">
          <div className="w-full h-2.5 bg-[var(--surface-2)] rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-[var(--accent)] rounded-full transition-all duration-700 ease-out"
              style={{ width: `${Math.max(4, percentageUsed)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs font-mono text-[var(--fg-muted)]">
            <span>${computeSpent.toFixed(2)} spent ({percentageUsed}%)</span>
            <span>${remainingCredit.toFixed(2)} remaining</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[var(--border)]/50">
          <div className="p-4 rounded-xl bg-[var(--surface-2)] transition-all duration-200 hover:-translate-y-0.5 shadow-xs">
            <span className="text-xs font-mono text-[var(--fg-muted)] block">Generations Run</span>
            <span className="text-2xl font-medium text-[var(--fg)] font-mono mt-1 block">
              {totalGenerations}
            </span>
            <span className="text-[11px] text-[var(--fg-faint)] mt-0.5 block">AI media synthesis renders</span>
          </div>

          <div className="p-4 rounded-xl bg-[var(--surface-2)] transition-all duration-200 hover:-translate-y-0.5 shadow-xs">
            <span className="text-xs font-mono text-[var(--fg-muted)] block">Cost per Render</span>
            <span className="text-2xl font-medium text-[var(--fg)] font-mono mt-1 block">
              $0.05
            </span>
            <span className="text-[11px] text-[var(--fg-faint)] mt-0.5 block">Standard video generation</span>
          </div>

          <div className="p-4 rounded-xl bg-[var(--surface-2)] transition-all duration-200 hover:-translate-y-0.5 shadow-xs">
            <span className="text-xs font-mono text-[var(--fg-muted)] block">Remaining Renders</span>
            <span className="text-2xl font-medium text-emerald-400 font-mono mt-1 block">
              ~{Math.floor(remainingCredit / costPerGen)}
            </span>
            <span className="text-[11px] text-[var(--fg-faint)] mt-0.5 block">Available at current rate</span>
          </div>
        </div>
      </div>

      {/* Credit Ledger / Info */}
      <div className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-[var(--fg)] font-mono uppercase tracking-wider">
            Demo Credits Notice
          </h3>
          <span className="text-xs font-mono text-[var(--accent)]">No Card Required</span>
        </div>
        <p className="text-xs sm:text-sm text-[var(--fg-muted)] leading-relaxed font-light">
          Enjoy a complimentary $10.00 credit grant to create videos and test your agent&apos;s adaptive memory.
          Top up anytime with the demo button above or connect your own API key for unlimited generation.
        </p>

        {onOpenStudio && (
          <div className="pt-2">
            <button
              onClick={onOpenStudio}
              className="inline-flex items-center gap-2 text-xs font-mono text-[var(--accent)] hover:text-[var(--fg)] transition"
            >
              <span>Go to Creative Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Backward compatibility alias for any existing imports
export { UsageView as OverviewView };

