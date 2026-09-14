'use client';

import React, { useState } from 'react';
import { Check, ArrowRight } from 'lucide-react';

export function NueDevelopersSection() {
  const [activeTab, setActiveTab] = useState<'efficiency' | 'visibility' | 'control'>('efficiency');

  return (
    <section id="features" className="py-24 px-4 bg-[var(--border)] text-[var(--fg)] relative overflow-hidden border-t border-stone-800 font-light">
      {/* Background Dot Mesh */}
      <div 
        className="absolute inset-0 opacity-[0.15] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(var(--accent) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* 2-Column Header (Exact mem0 Image 3 layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end mb-16">
          <div className="lg:col-span-7">
            <h2 className="text-3xl sm:text-5xl md:text-[54px] font-medium tracking-tight text-[var(--fg)] leading-[1.12] font-sans">
              Built for <span className="font-mono text-[var(--accent)]">&lt;developers&gt;</span> <br />
              who want proof, <br />
              not promises
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="text-[var(--fg-muted)] text-base sm:text-lg leading-relaxed font-light">
              Most AI agents are powerful in the moment but weak across time. Nue gives agents persistent memory without pipeline changes: less redundant context, lower token costs, measurably faster responses.
            </p>
          </div>
        </div>

        {/* macOS Dark Window */}
        <div className="rounded-2xl bg-[var(--surface)] border border-stone-800 shadow-2xl overflow-hidden">
          {/* Window Title Bar */}
          <div className="px-5 py-3.5 bg-[var(--surface-2)] border-b border-stone-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
              <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
              <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
            </div>

            <span className="text-xs font-mono text-[var(--fg-muted)] font-medium">Nue</span>

            <a
              href="#studio"
              className="text-xs font-medium text-[var(--fg-muted)] hover:text-[var(--fg)] transition flex items-center gap-1"
            >
              <span>Try Nue now</span>
              <ArrowRight className="w-3 h-3" />
            </a>
          </div>

          {/* Window Tabs Bar: Efficiency ○ | Visibility ○ | Control ○ */}
          <div className="grid grid-cols-3 border-b border-stone-800 text-xs font-mono">
            <button
              onClick={() => setActiveTab('efficiency')}
              className={`py-3.5 px-4 flex items-center justify-between transition border-r border-stone-800 ${
                activeTab === 'efficiency'
                  ? 'bg-[var(--surface-2)] text-[var(--fg)] font-medium'
                  : 'text-[var(--fg-muted)] hover:text-[var(--fg)] bg-[var(--surface)] font-light'
              }`}
            >
              <span>Efficiency</span>
              <span
                className={`w-2.5 h-2.5 rounded-full border ${
                  activeTab === 'efficiency'
                    ? 'border-[var(--accent)] bg-[var(--accent)]/20'
                    : 'border-stone-600'
                }`}
              />
            </button>

            <button
              onClick={() => setActiveTab('visibility')}
              className={`py-3.5 px-4 flex items-center justify-between transition border-r border-stone-800 ${
                activeTab === 'visibility'
                  ? 'bg-[var(--surface-2)] text-[var(--fg)] font-medium'
                  : 'text-[var(--fg-muted)] hover:text-[var(--fg)] bg-[var(--surface)] font-light'
              }`}
            >
              <span>Visibility</span>
              <span
                className={`w-2.5 h-2.5 rounded-full border ${
                  activeTab === 'visibility'
                    ? 'border-[var(--accent)] bg-[var(--accent)]/20'
                    : 'border-stone-600'
                }`}
              />
            </button>

            <button
              onClick={() => setActiveTab('control')}
              className={`py-3.5 px-4 flex items-center justify-between transition ${
                activeTab === 'control'
                  ? 'bg-[var(--surface-2)] text-[var(--fg)] font-medium'
                  : 'text-[var(--fg-muted)] hover:text-[var(--fg)] bg-[var(--surface)] font-light'
              }`}
            >
              <span>Control</span>
              <span
                className={`w-2.5 h-2.5 rounded-full border ${
                  activeTab === 'control'
                    ? 'border-[var(--accent)] bg-[var(--accent)]/20'
                    : 'border-stone-600'
                }`}
              />
            </button>
          </div>

          {/* Window Body (2 Columns) */}
          <div className="p-8 sm:p-12 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Column */}
            <div className="lg:col-span-6 space-y-4">
              {activeTab === 'efficiency' && (
                <>
                  <h3 className="text-2xl sm:text-3xl font-medium text-[var(--fg)] tracking-tight font-sans">
                    Memory Compression Engine
                  </h3>
                  <p className="text-[var(--fg-muted)] text-sm sm:text-base leading-relaxed font-light">
                    Nue distinguishes between temporary instructions (&quot;make this image brighter&quot;) and long-term preferences (&quot;I prefer bright, minimal visuals&quot;)—cutting tokens and latency while keeping the right context.
                  </p>
                  <div className="pt-4 flex items-center gap-6 font-mono text-xs text-[var(--fg-soft)] font-light">
                    <div>
                      <span className="text-[var(--accent)] text-lg font-medium block">78%</span>
                      <span className="text-[var(--fg-faint)] text-[11px] font-light">Context Token Reduction</span>
                    </div>
                    <div>
                      <span className="text-[var(--fg)] text-lg font-medium block">&lt;15ms</span>
                      <span className="text-[var(--fg-faint)] text-[11px] font-light">MemWal Recall Latency</span>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'visibility' && (
                <>
                  <h3 className="text-2xl sm:text-3xl font-medium text-[var(--fg)] tracking-tight font-sans">
                    Nue + Walrus Persistence
                  </h3>
                  <p className="text-[var(--fg-muted)] text-sm sm:text-base leading-relaxed font-light">
                    Walrus provides durable decentralized storage while Nue handles the memory lifecycle: creating, structuring, retrieving, and providing memories to agents as context.
                  </p>
                  <div className="pt-4 flex items-center gap-6 font-mono text-xs text-[var(--fg-soft)] font-light">
                    <div>
                      <span className="text-[var(--accent)] text-lg font-medium block">100%</span>
                      <span className="text-[var(--fg-faint)] text-[11px] font-light">Decoupled Architecture</span>
                    </div>
                    <div>
                      <span className="text-[var(--fg)] text-lg font-medium block">Sui Walrus</span>
                      <span className="text-[var(--fg-faint)] text-[11px] font-light">Durable Storage Layer</span>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'control' && (
                <>
                  <h3 className="text-2xl sm:text-3xl font-medium text-[var(--fg)] tracking-tight font-sans">
                    Memory Evolution Engine
                  </h3>
                  <p className="text-[var(--fg-muted)] text-sm sm:text-base leading-relaxed font-light">
                    Memory is not static. When a user expresses a new preference, Nue updates the memory rather than accumulating contradictory information indefinitely.
                  </p>
                  <div className="pt-4 flex items-center gap-6 font-mono text-xs text-[var(--fg-soft)] font-light">
                    <div>
                      <span className="text-[var(--accent)] text-lg font-medium block">Auto</span>
                      <span className="text-[var(--fg-faint)] text-[11px] font-light">Supersession Resolution</span>
                    </div>
                    <div>
                      <span className="text-[var(--fg)] text-lg font-medium block">Zero</span>
                      <span className="text-[var(--fg-faint)] text-[11px] font-light">Contradictory Accumulation</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Right Column: Visual Graphic (Exact mem0 Image 3 Layout with Authentic Nue Memory) */}
            <div className="lg:col-span-6">
              <div className="rounded-2xl bg-[var(--accent-bright)]/15 border border-[var(--accent)]/30 p-6 sm:p-8 relative overflow-hidden flex flex-col items-center justify-center min-h-[320px]">
                <div 
                  className="absolute inset-0 opacity-[0.2] pointer-events-none"
                  style={{
                    backgroundImage: 'radial-gradient(var(--accent) 1px, transparent 1px)',
                    backgroundSize: '16px 16px',
                  }}
                />

                {/* TAB 1: EFFICIENCY (Extract What Matters: Temporary vs Persistent) */}
                {activeTab === 'efficiency' && (
                  <div className="w-full max-w-sm rounded-xl bg-[var(--surface-2)] border border-stone-800 p-4 shadow-xl relative z-10 space-y-3">
                    {/* Extraction Tag Indicator */}
                    <div className="flex items-center justify-between text-[10px] font-mono text-[var(--fg-muted)] pb-1 border-b border-stone-800">
                      <span className="text-[var(--accent)]">NUE EXTRACTION ENGINE</span>
                      <span className="text-[var(--fg-faint)]">FILTER NOISE</span>
                    </div>

                    {/* User Message */}
                    <div className="flex justify-end">
                      <div className="rounded-xl rounded-tr-xs bg-[var(--accent)]/25 border border-[var(--accent)]/40 text-[var(--fg)] text-xs px-3.5 py-2.5 max-w-[92%] leading-relaxed font-light">
                        &quot;Make this clip 5 seconds shorter, and remember: I prefer bright, minimal visuals rather than cluttered layouts.&quot;
                      </div>
                    </div>

                    {/* Agent Response */}
                    <div className="flex justify-start">
                      <div className="rounded-xl rounded-tl-xs bg-[var(--accent-deep)] text-[var(--fg-soft)] text-xs px-3.5 py-2.5 max-w-[92%] leading-relaxed font-light">
                        &quot;Rendered the 5s cut. Extracted and committed your long-term preference for bright, minimal visuals to persistent memory.&quot;
                      </div>
                    </div>

                    {/* Dual Connector Lines down to SAVED badge */}
                    <div className="pt-2 flex flex-col items-center relative">
                      <div className="w-24 h-3 border-b border-x border-[var(--accent)]/60 rounded-b-sm mb-1" />
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[var(--surface)] text-[var(--surface)] text-[11px] font-medium font-mono shadow-md border border-[var(--surface)]">
                        <Check className="w-3.5 h-3.5 text-[var(--accent-deep)]" />
                        <span>SAVED TO WALRUS</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: VISIBILITY (Decoupled Architecture: Agent -> Nue -> Walrus) */}
                {activeTab === 'visibility' && (
                  <div className="w-full max-w-sm rounded-xl bg-[var(--surface-2)] border border-stone-800 p-5 shadow-xl relative z-10 space-y-3 font-mono text-xs">
                    <div className="p-3 rounded-lg bg-[var(--accent-deep)] border border-[var(--accent-deep)] text-center">
                      <span className="text-[var(--fg-muted)] text-[10px] block">RUNTIME INGESTION</span>
                      <span className="text-[var(--fg)] font-medium">AI AGENT (OpenAI / Claude / Livepeer)</span>
                    </div>

                    <div className="flex justify-center text-[var(--accent)]">
                      <span>↓ remember(context) · retrieve(query)</span>
                    </div>

                    <div className="p-3 rounded-lg bg-[var(--accent-deep)] border border-[var(--accent)]/50 text-center shadow-inner">
                      <span className="text-[var(--accent)] text-[10px] font-medium block">MEMORY INFRASTRUCTURE LAYER</span>
                      <span className="text-[var(--fg)] font-medium">NUE INTELLIGENCE ENGINE</span>
                      <span className="text-[10px] text-[var(--fg-muted)] block mt-0.5">Extraction · Structuring · Lifecycle</span>
                    </div>

                    <div className="flex justify-center text-[var(--accent)]">
                      <span>↓ durable cryptographic blobs</span>
                    </div>

                    <div className="p-3 rounded-lg bg-[var(--surface)] border border-stone-800 text-center flex items-center justify-between">
                      <div className="text-left">
                        <span className="text-[10px] text-[var(--fg-faint)] block">STORAGE BACKEND</span>
                        <span className="text-emerald-400 font-medium">SUI WALRUS BLOB</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-300">DECENTRALIZED</span>
                    </div>
                  </div>
                )}

                {/* TAB 3: CONTROL (Memory Evolution & Conflict Resolution) */}
                {activeTab === 'control' && (
                  <div className="w-full max-w-sm rounded-xl bg-[var(--surface-2)] border border-stone-800 p-4 shadow-xl relative z-10 space-y-3">
                    <div className="flex items-center justify-between text-[10px] font-mono pb-1 border-b border-stone-800">
                      <span className="text-[var(--fg-muted)]">MEMORY EVOLUTION</span>
                      <span className="text-emerald-400">ZERO CONFLICTS</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-red-950/20 border border-red-900/40 text-xs font-mono line-through text-[var(--fg-faint)]">
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-red-900/40 text-red-300 mr-1.5">Superseded</span>
                      &quot;Use dark, high-saturation color grading&quot;
                    </div>

                    <div className="p-2.5 rounded-lg bg-[var(--accent-deep)] border border-[var(--accent)]/40 text-xs font-mono text-[var(--fg)]">
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-[var(--accent-deep)]/40 text-[var(--accent)] mr-1.5">Active Preference</span>
                      &quot;Switch to bright, minimal monochrome aesthetics&quot;
                    </div>

                    <div className="pt-2 flex flex-col items-center">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[var(--surface)] text-[var(--surface)] text-[11px] font-medium font-mono shadow-md border border-[var(--surface)]">
                        <Check className="w-3.5 h-3.5 text-[var(--accent-deep)]" />
                        <span>UPDATED IN WALRUS MEMORY</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
