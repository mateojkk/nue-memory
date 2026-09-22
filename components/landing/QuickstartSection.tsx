'use client';

import React, { useState } from 'react';
import { Copy, Check, Code2 } from 'lucide-react';
import { Reveal } from '@/components/motion';
import { MemoryCompressionVisual } from './MemoryCompressionVisual';

export function QuickstartSection() {
  const [copiedClone, setCopiedClone] = useState(false);

  const handleCopyClone = () => {
    navigator.clipboard.writeText('git clone https://github.com/mateojkk/nue-memory.git');
    setCopiedClone(true);
    setTimeout(() => setCopiedClone(false), 2000);
  };

  return (
    <section id="docs" className="py-24 px-4 max-w-7xl mx-auto font-light relative">
      <div id="developers" className="absolute -top-16" />
      <Reveal>
        <div className="text-left mb-12">
        <div className="text-xs font-medium text-[var(--fg-muted)] uppercase tracking-wider mb-2">
          Developer Quickstart
        </div>
        <h2 className="text-3xl sm:text-4xl font-medium text-[var(--fg)] tracking-tight font-sans">
          Self-host memory for your agents in minutes.
        </h2>
        <p className="text-[var(--fg-muted)] text-sm sm:text-base mt-2 max-w-2xl font-light">
          No hosted API and no package yet — clone the repo, add your Groq and Walrus keys, and the MemoryClient behind Nue Motion runs for your own agents.
        </p>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Code Window (real MemoryClient API from lib/nue-memory/sdk.ts) */}
        <div className="lg:col-span-7 rounded-xl bg-[var(--surface)] shadow-xl overflow-hidden">
          {/* Header Bar */}
          <div className="px-5 py-3 bg-[var(--surface-2)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="w-3.5 h-3.5 text-[var(--fg-muted)]" />
              <span className="text-xs font-medium text-[var(--fg-soft)]">
                quickstart.ts
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--surface-2)] text-[var(--fg-muted)]">
                TypeScript
              </span>
            </div>
          </div>

          {/* Code Content */}
          <div className="p-6 font-mono text-xs leading-relaxed text-[var(--fg-soft)] overflow-x-auto bg-[var(--surface)]">
            <pre className="space-y-1">
              <div><span className="text-[var(--fg-muted)]">// .env.local: GROQ_API_KEY + MEMWAL_PRIVATE_KEY + MEMWAL_ACCOUNT_ID</span></div>
              <div><span className="text-[var(--fg-muted)]">import</span> &#123; MemoryClient &#125; <span className="text-[var(--fg-muted)]">from</span> <span className="text-[var(--accent-deep)]">&quot;./lib/nue-memory/sdk&quot;</span>;</div>
              <div className="text-transparent">_</div>
              <div><span className="text-[var(--fg-muted)]">const</span> client = <span className="text-[var(--fg-muted)]">new</span> MemoryClient(&#123; defaultUserId: <span className="text-[var(--accent-deep)]">&quot;creator_123&quot;</span> &#125;);</div>
              <div className="text-transparent">_</div>
              <div><span className="text-[var(--fg-muted)]">await</span> client.add(<span className="text-emerald-400">&quot;I prefer bright, minimal visual aesthetics.&quot;</span>, &#123; userId: <span className="text-[var(--accent-deep)]">&quot;creator_123&quot;</span>, domain: <span className="text-[var(--accent-deep)]">&quot;media&quot;</span> &#125;);</div>
              <div className="text-transparent">_</div>
              <div><span className="text-[var(--fg-muted)]">const</span> memories = <span className="text-[var(--fg-muted)]">await</span> client.search(</div>
              <div>  <span className="text-emerald-400">&quot;What are this user&apos;s visual preferences?&quot;</span>,</div>
              <div>  &#123; userId: <span className="text-[var(--accent-deep)]">&quot;creator_123&quot;</span>, domain: <span className="text-[var(--accent-deep)]">&quot;media&quot;</span> &#125;</div>
              <div>);</div>
            </pre>
          </div>
        </div>

        {/* Right Column: Clone Command & Workflow Pipeline */}
        <div className="lg:col-span-5 space-y-6">
          {/* Clone Repo Box (this repo is the SDK surface today - no published package yet) */}
          <div className="p-5 rounded-xl bg-[var(--surface)]">
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--fg-muted)] font-medium block mb-2">
              Clone the repo
            </span>
            <div className="flex items-center justify-between p-3 rounded-md bg-[var(--surface)] font-mono text-xs text-[var(--fg)]">
              <span className="truncate mr-2">git clone https://github.com/mateojkk/nue-memory.git</span>
              <button
                onClick={handleCopyClone}
                className="p-1 hover:text-[var(--fg)] text-[var(--fg-muted)] transition shrink-0"
                title="Copy clone command"
              >
                {copiedClone ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Live product visual: animated compression loop (no video file) */}
          <MemoryCompressionVisual />
        </div>
      </div>
    </section>
  );
}
