'use client';

import React, { useState } from 'react';
import { ArrowRight, Check, Copy, Terminal, Shield, Code2 } from 'lucide-react';
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

      {/* Eyebrow: NUE MEMORY */}
      <div className="text-xs font-medium text-[var(--fg-faint)] uppercase tracking-[0.2em] mb-8">
        Nue Memory <span className="text-[var(--fg-muted)]">·</span> NextMathLabs
      </div>

      {/* Headline: static, mem0-style */}
      <h1 className="text-4xl sm:text-6xl md:text-[64px] font-medium tracking-tight text-[var(--fg)] mb-6 max-w-5xl mx-auto leading-[1.08] font-sans">
        AI media agents can create. Nue lets them remember.
      </h1>

      {/* Supporting Copy */}
      <Reveal delay={120}>
        <p className="text-base sm:text-lg md:text-[19px] text-[var(--fg-muted)] max-w-3xl mx-auto mb-10 leading-relaxed font-light">
          AI agents forget. Nue remembers. Durable preferences that persist across sessions and agents.
        </p>
      </Reveal>

      {/* Dual Rectangular CTAs */}
      <Reveal delay={220}>
        <div className="flex flex-wrap items-center justify-center gap-3.5 mb-16">
          <button
            onClick={onGetStarted}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-[var(--accent-deep)] hover:bg-[var(--accent)] text-white text-sm font-medium transition shadow-sm"
          >
            <span>Get started</span>
            <ArrowRight className="w-4 h-4 text-white" />
          </button>

          <button
            onClick={onViewDocs}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--fg-soft)] hover:text-[var(--fg)] text-sm font-medium border border-[var(--border)] transition"
          >
            <span>View documentation</span>
          </button>
        </div>
      </Reveal>

      {/* Hero Visual: Memory Flow + SDK Preview Window */}
      <Reveal delay={320}>
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch text-left">
        {/* Left Column: Visual Flow Diagram (5 cols) */}
        <div className="lg:col-span-5 rounded-xl bg-[var(--surface)] border border-[var(--border)] p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--fg-muted)] font-medium">
              Architecture Pipeline
            </span>
            <span className="text-[10px] font-medium text-[var(--fg-muted)] flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Decoupled
            </span>
          </div>

          {/* ASCII Memory Flow Diagram */}
          <div className="py-6 flex flex-col items-center justify-center font-mono text-xs">
            <div className="w-full max-w-[240px] px-4 py-2.5 rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-center text-[var(--fg)] font-medium">
              AGENT
            </div>

            <div className="h-6 w-px bg-[var(--accent)]/50 relative">
              <div className="absolute bottom-0 -left-1 text-[10px] text-[var(--fg-muted)]">▼</div>
            </div>

            <div className="w-full max-w-[240px] p-4 rounded-md bg-[var(--surface-2)] border border-[var(--accent)]/40 text-center shadow-inner">
              <span className="text-[var(--fg)] font-medium block">NUE MEMORY</span>
              <span className="text-[10px] text-[var(--fg-muted)] block mt-1">
                retrieve / remember / evolve
              </span>
            </div>

            <div className="h-6 w-px bg-[var(--accent)]/50 relative">
              <div className="absolute bottom-0 -left-1 text-[10px] text-[var(--fg-muted)]">▼</div>
            </div>

            <div className="w-full max-w-[240px] px-4 py-2.5 rounded-md bg-[var(--surface-2)] border border-emerald-900/50 text-center text-emerald-400 font-medium">
              DURABLE STORE
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border)] text-xs text-[var(--fg-muted)] font-light flex items-center justify-between">
            <span>Storage: durable encrypted blobs</span>
            <span className="text-[var(--fg-faint)] font-medium text-[10px]">Zero Model Lock-in</span>
          </div>
        </div>

        {/* Right Column: Code Snippet (7 cols) */}
        <div className="lg:col-span-7 rounded-xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden flex flex-col">
          {/* Window Title Bar */}
          <div className="px-5 py-3.5 bg-[var(--surface-2)] border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="w-3.5 h-3.5 text-[var(--fg-muted)]" />
              <span className="text-xs font-medium text-[var(--fg-soft)]">quickstart.py</span>
            </div>

            <button
              onClick={handleCopyPip}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--border)] hover:bg-[var(--border)] text-[var(--fg-soft)] text-xs font-mono border border-[var(--border)] transition"
            >
              <Terminal className="w-3 h-3 text-[var(--fg-muted)]" />
              <span>pip install nue-ai</span>
              {copiedPip ? (
                <Check className="w-3 h-3 text-emerald-400 ml-1" />
              ) : (
                <Copy className="w-3 h-3 text-[var(--fg-faint)] ml-1" />
              )}
            </button>
          </div>

          {/* Code Body */}
          <div className="p-5 font-mono text-xs leading-relaxed text-[var(--fg-soft)] overflow-x-auto bg-[var(--surface)] flex-1">
            <pre className="space-y-1">
              <div><span className="text-[var(--fg-faint)]"># Step 1: Initialize Nue Memory client</span></div>
              <div><span className="text-[var(--fg-muted)]">from</span> nue <span className="text-[var(--fg-muted)]">import</span> MemoryClient</div>
              <div className="text-transparent">_</div>
              <div>client = MemoryClient(api_key=<span className="text-[var(--accent-deep)]">&quot;...&quot;</span>)</div>
              <div className="text-transparent">_</div>
              <div><span className="text-[var(--fg-faint)]"># Step 2: Extract durable preference</span></div>
              <div>client.add(</div>
              <div>    [</div>
              <div>        &#123;</div>
              <div>            <span className="text-[var(--accent-deep)]">&quot;role&quot;</span>: <span className="text-[var(--accent-deep)]">&quot;user&quot;</span>,</div>
              <div>            <span className="text-[var(--accent-deep)]">&quot;content&quot;</span>: <span className="text-emerald-400">&quot;I prefer bright, minimal visual aesthetics.&quot;</span></div>
              <div>        &#125;</div>
              <div>    ],</div>
              <div>    user_id=<span className="text-[var(--accent-deep)]">&quot;agent_123&quot;</span></div>
              <div>)</div>
              <div className="text-transparent">_</div>
              <div><span className="text-[var(--fg-faint)]"># Step 3: Search relevant context across future sessions</span></div>
              <div>memories = client.search(</div>
              <div>    <span className="text-emerald-400">&quot;What are this user&apos;s visual preferences?&quot;</span>,</div>
              <div>    filters=&#123;<span className="text-[var(--accent-deep)]">&quot;user_id&quot;</span>: <span className="text-[var(--accent-deep)]">&quot;agent_123&quot;</span>&#125;</div>
              <div>)</div>
            </pre>
          </div>
        </div>
        </div>
      </Reveal>
    </section>
  );
}
