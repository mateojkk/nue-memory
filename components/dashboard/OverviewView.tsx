'use client';

import React from 'react';
import { Database, Cpu, ShieldCheck, Zap, Layers, Sparkles, ArrowRight } from 'lucide-react';
import { MediaPreference } from '@/lib/types';
import { useSystemHealth, connectionIndicator } from '@/lib/hooks/useSystemHealth';

interface OverviewViewProps {
  memories: MediaPreference[];
  onOpenWorkspace: () => void;
  onOpenMemories: () => void;
}

export function OverviewView({ memories, onOpenWorkspace, onOpenMemories }: OverviewViewProps) {
  const { health, isLoading } = useSystemHealth();
  const activeCount = memories.filter((m) => m.isActive).length;
  const supersededCount = memories.filter((m) => !m.isActive).length;
  const persistedCount = memories.filter((m) => m.memwalBlobId).length;
  const walrus = connectionIndicator(health.walrus.state, isLoading);
  const livepeer = connectionIndicator(health.livepeer.state, isLoading);

  // Honest setup progress — derived from real system state only
  const walrusReady = health.walrus.state === 'connected';
  const livepeerReady = health.livepeer.state === 'configured';
  const memoriesStored = memories.length > 0;
  const persisted = memories.length > 0 && persistedCount === memories.length;
  const steps = [
    { label: 'Walrus keys configured (MEMWAL_* env)', done: walrusReady },
    { label: 'Livepeer Agent key configured', done: livepeerReady },
    { label: 'First memories extracted & stored', done: memoriesStored },
    { label: 'All memories persisted to Walrus blobs', done: persisted },
  ];
  const firstUndone = steps.find((s) => !s.done);
  const nextStepHint = isLoading
    ? 'Checking system state…'
    : firstUndone
    ? firstUndone.label.replace(/^Walrus keys configured \(MEMWAL_\* env\)$/, 'Add MEMWAL_PRIVATE_KEY and MEMWAL_ACCOUNT_ID to .env.local')
        .replace(/^Livepeer Agent key configured$/, 'Add LIVEPEER_API_KEY to .env.local (or use the free keyless demo credit)')
        .replace(/^First memories extracted & stored$/, 'Generate media in the Media Studio and confirm a memory')
        .replace(/^All memories persisted to Walrus blobs$/, 'Click "Remember" on a memory to persist it to Walrus')
    : 'All set — run the 2-project demo journey for submission.';

  return (
    <div className="space-y-8 font-light text-left">
      {/* Header */}
      <div className="pb-6 border-b border-[var(--border)]">
        <div className="text-xs font-mono text-[var(--accent)] uppercase tracking-wider mb-1">
          Infrastructure Telemetry
        </div>
        <h2 className="text-2xl sm:text-3xl font-medium text-[var(--fg)] tracking-tight font-sans">
          Nue Memory System Overview
        </h2>
        <p className="text-[var(--fg-muted)] text-xs sm:text-sm mt-1">
          Decoupled memory intelligence layer bridging AI agent runtimes with Sui Walrus decentralized storage.
        </p>
      </div>

      {/* Connectivity Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-[var(--fg-faint)]">
            <span>STORAGE BACKEND</span>
            <span className={walrus.dotClass} title={health.walrus.message} />
          </div>
          <div className="text-lg font-medium text-[var(--fg)] font-sans">Sui Walrus (MemWal)</div>
          <div className={`text-xs font-light ${health.walrus.state === 'connected' ? 'text-[var(--fg-muted)]' : 'text-red-400'}`}>
            {health.walrus.message || 'Decentralized blob persistence · Zero model lock-in'}
          </div>
        </div>

        <div className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-[var(--fg-faint)]">
            <span>MEDIA EXECUTION</span>
            <span className={livepeer.dotClass} title={health.livepeer.message} />
          </div>
          <div className="text-lg font-medium text-[var(--fg)] font-sans">Livepeer Agent MCP</div>
          <div className={`text-xs font-light ${health.livepeer.state === 'configured' ? 'text-[var(--fg-muted)]' : 'text-red-400'}`}>
            {health.livepeer.message || 'Remote MCP tool · Context-augmented generation'}
          </div>
        </div>

        <div className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-[var(--fg-faint)]">
            <span>MEMORY INTELLIGENCE</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="text-lg font-medium text-[var(--fg)] font-sans">Nue Evolution Engine</div>
          <div className="text-xs text-[var(--fg-muted)] font-light">
            Extraction, noise filtering &amp; supersession pointers active
          </div>
        </div>
      </div>

      {/* Quick Stats & Launch Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8 p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <span className="text-xs font-mono text-[var(--fg-muted)] uppercase tracking-wider">
              Memory Ledger Summary
            </span>
            <button
              onClick={onOpenMemories}
              className="text-xs font-mono text-[var(--accent)] hover:text-[var(--fg)] transition flex items-center gap-1"
            >
              <span>View All Records</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 font-mono text-center">
            <div className="p-4 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
              <span className="text-2xl font-medium text-[var(--fg)] block">{activeCount}</span>
              <span className="text-[11px] text-[var(--fg-muted)] block mt-1">Active Preferences</span>
            </div>
            <div className="p-4 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
              <span className="text-2xl font-medium text-[var(--fg-soft)] block">{supersededCount}</span>
              <span className="text-[11px] text-[var(--fg-muted)] block mt-1">Superseded Records</span>
            </div>
            <div className="p-4 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
              <span
                className={`text-2xl font-medium block ${
                  persistedCount === memories.length && memories.length > 0 ? 'text-emerald-400' : 'text-[var(--fg-soft)]'
                }`}
              >
                {persistedCount}/{memories.length}
              </span>
              <span className="text-[11px] text-[var(--fg-muted)] block mt-1">Walrus-Persisted Records</span>
            </div>
          </div>

          <div className="text-xs text-[var(--fg-muted)] font-light leading-relaxed">
            Nue sits between your AI agents and decentralized storage. When users express preferences, Nue parses what matters and keeps context sharp across any number of subsequent runs.
          </div>
        </div>

        {/* Setup & Progress + Media Memory Fast Launch */}
        <div className="space-y-6 lg:col-span-4 flex flex-col">
          {/* Honest Setup & Progress — shows how far along we really are */}
          <div className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-4 flex-1">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <span className="text-xs font-mono text-[var(--fg-muted)] uppercase tracking-wider">
                Setup &amp; Progress
              </span>
              <span className="text-xs font-mono text-[var(--accent)] font-medium">
                {steps.filter((s) => s.done).length}/{steps.length} ready
              </span>
            </div>
            <ul className="space-y-2.5 text-xs font-mono">
              {steps.map((step) => (
                <li key={step.label} className="flex items-start gap-2">
                  <span
                    className={`mt-0.5 w-3.5 h-3.5 shrink-0 rounded-sm border flex items-center justify-center text-[9px] ${
                      step.done
                        ? 'bg-emerald-500/90 border-emerald-500 text-white'
                        : 'border-[var(--border)] text-transparent'
                    }`}
                  >
                    ✓
                  </span>
                  <span className={step.done ? 'text-[var(--fg-soft)]' : 'text-[var(--fg-faint)]'}>
                    {step.label}
                  </span>
                </li>
              ))}
            </ul>
            {nextStepHint && (
              <div className="text-[11px] font-mono text-[var(--fg-muted)] border-t border-[var(--border)] pt-3 leading-relaxed">
                <span className="text-[var(--accent)]">Next:</span> {nextStepHint}
              </div>
            )}
          </div>

          <div className="p-6 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex flex-col justify-between shadow-lg shadow-[var(--accent)]/5">
            <div className="space-y-2">
              <span className="text-[11px] font-mono text-[var(--accent)] uppercase tracking-wider block">
                Flagship Feature
              </span>
              <h3 className="text-xl font-medium text-[var(--fg)] font-sans">Media Memory</h3>
              <p className="text-xs text-[var(--fg-muted)] font-light leading-relaxed">
                Test the end-to-end loop: generate media with Livepeer Agent, submit feedback, store preferences, and experience zero-reprompt recall in a new project.
              </p>
            </div>

            <button
              onClick={onOpenWorkspace}
              className="w-full mt-6 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-[var(--accent-deep)] hover:bg-[var(--accent)] text-[#4a2c0e] text-xs font-medium transition shadow-md"
            >
              <span>Launch Media Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
