'use client';

import React, { useState } from 'react';
import { ArrowRight, Check, Shield, Sparkles } from 'lucide-react';
import { Reveal } from '@/components/motion';

interface HeroSectionProps {
  onGetStarted: () => void;
  onViewDocs: () => void;
}

export function HeroSection({ onGetStarted, onViewDocs }: HeroSectionProps) {
  const [copiedPip, setCopiedPip] = useState(false);

  const handleCopyPip = () => {
    navigator.clipboard.writeText('pip install nue-ai');
    setCopiedPip(true);
    setTimeout(() => setCopiedPip(false), 2000);
  };

  return (
    <section className="relative pt-20 pb-28 px-4 max-w-7xl mx-auto text-center font-light overflow-hidden">
      {/* Background ambient radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[var(--accent)]/40 pointer-events-none rounded-full blur-3xl" />

      {/* Headline: Infrastructure-First */}
      <h1 className="text-4xl sm:text-6xl md:text-[64px] font-medium tracking-tight text-[var(--fg)] mb-6 max-w-5xl mx-auto leading-[1.08] font-sans">
        The memory infrastructure layer for AI agents.
      </h1>

      {/* Supporting Copy */}
      <Reveal delay={120}>
        <p className="text-base sm:text-lg md:text-[19px] text-[var(--fg-muted)] max-w-3xl mx-auto mb-10 leading-relaxed font-light">
          AI agents forget between sessions. Nue gives them durable, evolving memory — extracting what matters, resolving conflicts, and persisting preferences across models and workflows.
        </p>
      </Reveal>

      {/* Dual Rectangular CTAs */}
      <Reveal delay={220}>
        <div className="flex flex-wrap items-center justify-center gap-3.5 mb-16">
          <button
            onClick={onGetStarted}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-[var(--accent-deep)] hover:bg-[var(--accent)] text-[#4a2c0e] text-sm font-medium transition shadow-sm hover:scale-105 active:scale-95 duration-200"
          >
            <span>Launch Nue Motion · Free $10 Credit</span>
            <ArrowRight className="w-4 h-4 text-[#4a2c0e]" />
          </button>

          <button
            onClick={onViewDocs}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--fg-soft)] hover:text-[var(--fg)] text-sm font-medium border border-[var(--border)] transition"
          >
            <span>Developer Quickstart</span>
          </button>
        </div>
      </Reveal>

      {/* Hero Visual: Architecture Pipeline + Live Extraction Showcase */}
      <Reveal delay={320}>
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch text-left">
          {/* Left Column: Architecture Pipeline (5 cols) */}
          <div className="lg:col-span-5 rounded-xl bg-[var(--surface)] border border-[var(--border)] p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
              <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--fg-muted)]">
                Architecture Pipeline
              </span>
              <span className="text-[10px] font-medium text-[var(--fg-muted)] flex items-center gap-1">
                <Shield className="w-3 h-3 text-[var(--accent)]" />
                Decoupled
              </span>
            </div>

            {/* Memory Flow Diagram */}
            <div className="py-6 flex flex-col items-center justify-center font-mono text-xs">
              <div className="w-full max-w-[240px] px-4 py-2.5 rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-center text-[var(--fg)] font-medium shadow-xs">
                AGENT RUNTIME
              </div>

              <div className="h-6 w-px bg-[var(--accent)]/50 relative">
                <div className="absolute bottom-0 -left-1 text-[10px] text-[var(--fg-muted)]">▼</div>
              </div>

              <div className="w-full max-w-[240px] p-4 rounded-md bg-[var(--surface-2)] border border-[var(--accent)]/40 text-center shadow-xs">
                <span className="text-[var(--fg)] font-medium block">NUE MEMORY ENGINE</span>
                <span className="text-[10px] text-[var(--fg-muted)] block mt-1">
                  extract · resolve · evolve
                </span>
              </div>

              <div className="h-6 w-px bg-[var(--accent)]/50 relative">
                <div className="absolute bottom-0 -left-1 text-[10px] text-[var(--fg-muted)]">▼</div>
              </div>

              <div className="w-full max-w-[240px] px-4 py-2.5 rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-center text-[var(--fg)] font-medium shadow-xs">
                DURABLE STORAGE
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border)] text-xs text-[var(--fg-muted)] font-light flex items-center justify-between">
              <span>Decentralized blob persistence</span>
              <span className="text-[var(--fg-faint)] font-medium text-[10px]">Zero Lock-in</span>
            </div>
          </div>

          {/* Right Column: Live Memory Extraction Visual (7 cols) */}
          <div className="lg:col-span-7 rounded-xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden flex flex-col p-6 sm:p-7 shadow-xs justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span className="text-xs font-medium text-[var(--fg)]">Continuous Memory Extraction</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--surface-2)] text-emerald-500 border border-[var(--border)]">
                Live Pipeline
              </span>
            </div>

            <div className="space-y-4">
              {/* Step 1: Raw Turn */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-mono text-[var(--fg-muted)] uppercase tracking-wider">
                  1. Unstructured User Interaction
                </div>
                <div className="p-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-xs text-[var(--fg-soft)] font-mono">
                  &ldquo;Make the captions larger, the pacing faster, and drop the dramatic music.&rdquo;
                </div>
              </div>

              {/* Step 2: Extracted Structured Memory Objects */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-mono text-[var(--fg-muted)] uppercase tracking-wider flex items-center justify-between">
                  <span>2. Extracted Memory Objects</span>
                  <span className="text-emerald-500 text-[9px] font-medium">Confidence &gt; 90%</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-xs font-mono">
                    <div className="text-[9px] text-[var(--accent)] uppercase font-semibold">Typography</div>
                    <div className="text-[var(--fg)] text-[11px] mt-0.5 truncate">Large high-contrast captions</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-xs font-mono">
                    <div className="text-[9px] text-[var(--accent)] uppercase font-semibold">Pacing</div>
                    <div className="text-[var(--fg)] text-[11px] mt-0.5 truncate">Fast 0-5s video intro</div>
                  </div>
                </div>
              </div>

              {/* Step 3: Persistence & Automatic Recall */}
              <div className="p-3 rounded-lg bg-[var(--surface-2)] border border-[var(--accent)]/30 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="text-[var(--fg)] text-[11px]">
                    Persisted to decentralized storage · Auto-injected in next session
                  </span>
                </div>
                <span className="text-[10px] text-[var(--accent)] font-medium shrink-0 ml-2">
                  Zero Re-prompting
                </span>
              </div>
            </div>

            <div className="pt-3.5 mt-4 border-t border-[var(--border)] text-[11px] text-[var(--fg-muted)] flex items-center justify-between">
              <span>Eliminates repeating creative preferences across projects</span>
              <span className="text-[var(--fg-faint)] font-mono text-[10px]">Active Memory Ledger</span>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
