'use client';

import React, { useState } from 'react';
import {
  CreditCard,
  RotateCcw,
  Zap,
  ArrowRight,
  ShieldCheck,
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
  const { email, creditBalance, creditsLoading, livepeerKey, saveLivepeerKey, removeLivepeerKey } = useAuth();
  const [keyInput, setKeyInput] = useState('');
  const [keyError, setKeyError] = useState<string | null>(null);
  const [keySaving, setKeySaving] = useState(false);

  // Balance is unknown until /api/profile resolves - never render the $10
  // grant default first. Skeletons hold the computed spots meanwhile.
  const balanceKnown = !creditsLoading && creditBalance !== null;
  const remainingCredit = balanceKnown ? Number((creditBalance as number).toFixed(2)) : 0;

  // User-specific compute usage calculation
  const totalGenerations = versions.length;
  const costPerTake = 3.47;
  const computeSpent = balanceKnown ? Number((totalGenerations * costPerTake).toFixed(2)) : 0;
  const totalGrant = Math.max(10.0, Number((remainingCredit + computeSpent).toFixed(2)));
  const percentageUsed = Math.min(100, Math.round((computeSpent / totalGrant) * 100));

  const livepeer = connectionIndicator(health.livepeer.state, isLoading);

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-light text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-medium text-[var(--fg)] tracking-tight font-sans">
            Credits &amp; Usage
          </h2>
          <p className="text-[var(--fg-muted)] text-xs sm:text-sm mt-1">
            Monitor your AI media generation credits and balance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {email && (
            <span className="text-xs font-mono text-[var(--fg-muted)] px-3 py-1.5 rounded-lg bg-[var(--surface-2)]">
              Account: <span className="text-[var(--fg)] font-medium">{email}</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Credit Balance Card */}
      <div className="interactive-card p-6 sm:p-8 rounded-2xl bg-[var(--surface)] shadow-lg space-y-6 animate-fadeIn">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-mono uppercase tracking-wider text-[var(--fg-muted)]">
              Available Credit Balance
            </span>
            <div className="flex items-baseline gap-3">
              {balanceKnown ? (
                <>
                  <span className="text-4xl sm:text-5xl font-semibold text-[var(--fg)] font-mono">
                    ${remainingCredit.toFixed(2)}
                  </span>
                  <span className="text-sm font-mono text-[var(--fg-muted)]">
                    / ${totalGrant.toFixed(2)} USD
                  </span>
                </>
              ) : (
                <span className="h-12 w-56 rounded-lg bg-[var(--surface-2)] animate-pulse" aria-label="Loading balance" />
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--surface-2)] text-xs font-mono shadow-xs">
            <span className={livepeer.dotClass} />
            <span className="text-[var(--fg-soft)]">
              {health.livepeer.state === 'configured' ? 'Generation Engine Active' : 'Free Demo Tier Active'}
            </span>
          </div>
        </div>

        {/* Usage Progress Bar */}
        <div className="space-y-2">
          <div className="w-full h-2.5 bg-[var(--surface-2)] rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-[var(--accent)] rounded-full transition-all duration-700 ease-out"
              style={{ width: `${balanceKnown ? Math.max(4, percentageUsed) : 4}%` }}
            />
          </div>
          <div className="flex justify-between text-xs font-mono text-[var(--fg-muted)]">
            <span>≈${computeSpent.toFixed(2)} spent ({balanceKnown ? `${percentageUsed}%` : '…'})</span>
            <span>{balanceKnown ? `$${remainingCredit.toFixed(2)} remaining` : 'Loading balance…'}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <div className="p-4 rounded-xl bg-[var(--surface-2)] transition-all duration-200 hover:-translate-y-0.5 shadow-xs">
            <span className="text-xs font-mono text-[var(--fg-muted)] block">Generations Run</span>
            <span className="text-2xl font-medium text-[var(--fg)] font-mono mt-1 block">
              {totalGenerations}
            </span>
            <span className="text-[11px] text-[var(--fg-faint)] mt-0.5 block">AI media generations</span>
          </div>

          <div className="p-4 rounded-xl bg-[var(--surface-2)] transition-all duration-200 hover:-translate-y-0.5 shadow-xs">
            <span className="text-xs font-mono text-[var(--fg-muted)] block">Cost per Take</span>
            <span className="text-2xl font-medium text-[var(--fg)] font-mono mt-1 block">
              ~$3.47
            </span>
            <span className="text-[11px] text-[var(--fg-faint)] mt-0.5 block">Live Livepeer rate, 15s take</span>
          </div>

          <div className="p-4 rounded-xl bg-[var(--surface-2)] transition-all duration-200 hover:-translate-y-0.5 shadow-xs">
            <span className="text-xs font-mono text-[var(--fg-muted)] block">Remaining Renders</span>
            <span className="text-2xl font-medium text-emerald-400 font-mono mt-1 block">
              {balanceKnown ? `~${Math.floor(remainingCredit / costPerTake)}` : '…'}
            </span>
            <span className="text-[11px] text-[var(--fg-faint)] mt-0.5 block">Available at current rate</span>
          </div>
        </div>
      </div>

      {/* Bring-your-own Livepeer key: renders bill their account, $0 here */}
      <div className="p-6 rounded-xl bg-[var(--surface)] shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-[var(--fg)] font-mono uppercase tracking-wider">
            Your Livepeer Key
          </h3>
          {livepeerKey.has ? (
            <span className="text-xs font-mono text-emerald-400">Attached{livepeerKey.tail ? ` (${livepeerKey.tail})` : ''}</span>
          ) : (
            <span className="text-xs font-mono text-[var(--fg-faint)]">Demo credit in use</span>
          )}
        </div>
        <p className="text-xs sm:text-sm text-[var(--fg-muted)] leading-relaxed font-light">
          Spent your $10 grant? Attach your own Livepeer key and renders bill your account instead - $0 on our ledger. Stored sealed, never shown again.{' '}
          <a
            href="https://app.daydream.live"
            target="_blank"
            rel="noreferrer"
            className="text-[var(--accent)] hover:text-[var(--fg)] transition underline underline-offset-2"
          >
            Get or revoke keys at Daydream
          </a>.
        </p>
        {livepeerKey.has ? (
          <button
            onClick={() => removeLivepeerKey()}
            className="px-4 py-2 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--surface-2)]/80 text-[var(--fg-soft)] text-xs font-mono transition"
          >
            Remove key
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="password"
                value={keyInput}
                onChange={(e) => {
                  setKeyInput(e.target.value);
                  setKeyError(null);
                }}
                placeholder="Paste Livepeer API token"
                autoComplete="off"
                className="flex-1 px-3.5 py-2 rounded-lg bg-[var(--surface-2)] text-xs font-mono text-[var(--fg)] placeholder:text-[var(--fg-faint)] focus:outline-none"
              />
              <button
                onClick={async () => {
                  setKeySaving(true);
                  const err = await saveLivepeerKey(keyInput.trim());
                  setKeySaving(false);
                  if (err) {
                    setKeyError(err);
                  } else {
                    setKeyInput('');
                    setKeyError(null);
                  }
                }}
                disabled={keySaving || keyInput.trim().length === 0}
                className="px-4 py-2 rounded-lg bg-[var(--accent-deep)] hover:bg-[var(--accent)] text-[#4a2c0e] text-xs font-medium transition shadow-sm disabled:opacity-50 whitespace-nowrap"
              >
                {keySaving ? 'Saving…' : 'Save key'}
              </button>
            </div>
            {keyError && <p className="text-xs font-mono text-red-400">{keyError}</p>}
          </div>
        )}
      </div>

      {/* Credit Ledger / Info */}
      <div className="p-6 rounded-xl bg-[var(--surface)] shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-[var(--fg)] font-mono uppercase tracking-wider">
            Demo Credits Notice
          </h3>
          <span className="text-xs font-mono text-[var(--accent)]">No Card Required</span>
        </div>
        <p className="text-xs sm:text-sm text-[var(--fg-muted)] leading-relaxed font-light">
          Enjoy a complimentary $10.00 credit grant to create videos and test your agent&apos;s adaptive memory.
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

