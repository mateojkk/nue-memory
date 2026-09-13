'use client';

import React, { useState } from 'react';
import { ArrowRight, Check, Copy, Terminal, Shield } from 'lucide-react';

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
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#c88d51]/5 blur-[120px] pointer-events-none rounded-full" />

      {/* Eyebrow: NUE MEMORY */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#161310] border border-[#2d2620] text-xs font-mono text-[#c88d51] mb-8">
        <span className="w-1.5 h-1.5 rounded-full bg-[#c88d51] animate-pulse" />
        <span className="tracking-wider uppercase text-[11px] font-medium">Nue Memory</span>
      </div>

      {/* Headline: The memory infrastructure layer for AI agents */}
      <h1 className="text-4xl sm:text-6xl md:text-[68px] font-medium tracking-tight text-white mb-6 max-w-5xl mx-auto leading-[1.08] font-sans">
        The memory infrastructure layer <br className="hidden sm:inline" />
        for AI agents.
      </h1>

      {/* Supporting Copy */}
      <p className="text-base sm:text-lg md:text-[19px] text-stone-400 max-w-3xl mx-auto mb-10 leading-relaxed font-light">
        AI agents can reason, use tools, and complete tasks, but they often treat every interaction as a new beginning. Nue gives agents persistent memory to retain what matters, learn from previous interactions, and evolve over time.
      </p>

      {/* Dual Rectangular CTAs */}
      <div className="flex flex-wrap items-center justify-center gap-3.5 mb-16">
        <button
          onClick={onGetStarted}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-[#ededed] hover:bg-white text-[#0c0a09] text-sm font-medium transition shadow-sm"
        >
          <span>Get started</span>
          <ArrowRight className="w-4 h-4 text-[#0c0a09]" />
        </button>

        <button
          onClick={onViewDocs}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-[#141210] hover:bg-[#1a1714] text-stone-300 hover:text-white text-sm font-medium border border-[#29231f] transition"
        >
          <span>View documentation</span>
        </button>
      </div>

      {/* Hero Visual: Memory Flow + SDK Preview Window */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch text-left">
        {/* Left Column: Visual Flow Diagram (5 cols) */}
        <div className="lg:col-span-5 rounded-xl bg-[#12100e] border border-[#26211d] p-6 sm:p-7 flex flex-col justify-between shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between pb-4 border-b border-[#241e1a]">
            <span className="text-[11px] font-mono uppercase tracking-wider text-stone-400 font-medium">
              Architecture Pipeline
            </span>
            <span className="text-[10px] font-mono text-[#c88d51] flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Decoupled
            </span>
          </div>

          {/* ASCII Memory Flow Diagram */}
          <div className="py-6 flex flex-col items-center justify-center font-mono text-xs">
            <div className="w-full max-w-[240px] px-4 py-2.5 rounded-md bg-[#1a1714] border border-[#332c25] text-center text-white font-medium">
              AGENT
            </div>

            <div className="h-6 w-px bg-[#c88d51]/50 relative">
              <div className="absolute bottom-0 -left-1 text-[10px] text-[#c88d51]">▼</div>
            </div>

            <div className="w-full max-w-[240px] p-4 rounded-md bg-[#1f1a15] border border-[#c88d51]/40 text-center shadow-inner">
              <span className="text-white font-medium block">NUE MEMORY</span>
              <span className="text-[10px] text-[#c88d51] block mt-1">
                retrieve / remember / evolve
              </span>
            </div>

            <div className="h-6 w-px bg-[#c88d51]/50 relative">
              <div className="absolute bottom-0 -left-1 text-[10px] text-[#c88d51]">▼</div>
            </div>

            <div className="w-full max-w-[240px] px-4 py-2.5 rounded-md bg-[#121411] border border-emerald-900/50 text-center text-emerald-400 font-medium">
              WALRUS
            </div>
          </div>

          <div className="pt-4 border-t border-[#241e1a] text-xs text-stone-400 font-light flex items-center justify-between">
            <span>Storage: Sui Walrus Blobs</span>
            <span className="text-stone-500 font-mono text-[10px]">Zero Model Lock-in</span>
          </div>
        </div>

        {/* Right Column: Code Snippet (7 cols) */}
        <div className="lg:col-span-7 rounded-xl bg-[#12100e] border border-[#26211d] shadow-2xl overflow-hidden flex flex-col">
          {/* Window Title Bar */}
          <div className="px-5 py-3.5 bg-[#171411] border-b border-[#241f1a] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3d332c]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#3d332c]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#3d332c]" />
              <span className="ml-2 text-xs font-mono text-stone-400">quickstart.py</span>
            </div>

            <button
              onClick={handleCopyPip}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#211b17] hover:bg-[#2b241e] text-stone-300 text-xs font-mono border border-[#332b24] transition"
            >
              <Terminal className="w-3 h-3 text-[#c88d51]" />
              <span>pip install nue-ai</span>
              {copiedPip ? (
                <Check className="w-3 h-3 text-emerald-400 ml-1" />
              ) : (
                <Copy className="w-3 h-3 text-stone-500 ml-1" />
              )}
            </button>
          </div>

          {/* Code Body */}
          <div className="p-5 font-mono text-xs leading-relaxed text-stone-300 overflow-x-auto bg-[#0f0e0c] flex-1">
            <pre className="space-y-1">
              <div><span className="text-stone-500"># Step 1: Initialize Nue Memory client</span></div>
              <div><span className="text-[#c88d51]">from</span> nue <span className="text-[#c88d51]">import</span> MemoryClient</div>
              <div className="text-transparent">_</div>
              <div>client = MemoryClient(api_key=<span className="text-amber-200">&quot;...&quot;</span>)</div>
              <div className="text-transparent">_</div>
              <div><span className="text-stone-500"># Step 2: Store interaction — Nue extracts durable preference</span></div>
              <div>client.add(</div>
              <div>    [</div>
              <div>        &#123;</div>
              <div>            <span className="text-amber-200">&quot;role&quot;</span>: <span className="text-amber-200">&quot;user&quot;</span>,</div>
              <div>            <span className="text-amber-200">&quot;content&quot;</span>: <span className="text-emerald-400">&quot;I prefer bright, minimal visual aesthetics.&quot;</span></div>
              <div>        &#125;</div>
              <div>    ],</div>
              <div>    user_id=<span className="text-amber-200">&quot;agent_123&quot;</span></div>
              <div>)</div>
              <div className="text-transparent">_</div>
              <div><span className="text-stone-500"># Step 3: Search relevant context across future sessions</span></div>
              <div>memories = client.search(</div>
              <div>    <span className="text-emerald-400">&quot;What are this user&apos;s visual preferences?&quot;</span>,</div>
              <div>    filters=&#123;<span className="text-amber-200">&quot;user_id&quot;</span>: <span className="text-amber-200">&quot;agent_123&quot;</span>&#125;</div>
              <div>)</div>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
