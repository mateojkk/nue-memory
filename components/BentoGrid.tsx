'use client';

import React from 'react';
import { Cpu, Eye, GitBranch, Database, CheckCircle2 } from 'lucide-react';

export function BentoGrid() {
  return (
    <section id="features" className="py-24 px-4 max-w-7xl mx-auto">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[var(--surface)] border border-[var(--surface-2)] text-[var(--accent-deep)] text-xs font-mono font-semibold mb-4">
          <Cpu className="w-3.5 h-3.5" />
          <span>Core Capabilities</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[var(--surface)] mb-4">
          Built for creators who want{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-deep)] via-[var(--accent)] to-[var(--accent-deep)]">
            proof, not promises
          </span>
        </h2>
        <p className="text-sm sm:text-base text-[var(--fg-muted)] leading-relaxed">
          Traditional AI media agents suffer from creative amnesia. Nue Memory introduces an autonomous memory layer 
          that extracts, evolves, and injects creative preferences on Sui Walrus without configuration.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Memory Compression & Extraction (Spans 2 cols on lg) */}
        <div className="lg:col-span-2 rounded-2xl bg-white border border-[var(--surface-2)] hover:border-[var(--accent)]/50 p-6 sm:p-8 transition-all duration-300 relative overflow-hidden group shadow-sm hover:shadow-xl hover:shadow-[var(--accent)]/5">
          <div className="flex items-center justify-between mb-5">
            <div className="w-11 h-11 rounded-xl bg-[var(--surface)] border border-[var(--surface-2)] flex items-center justify-center text-[var(--accent-deep)]">
              <Cpu className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--fg-muted)] bg-[var(--surface)] px-3 py-1 rounded-md border border-[var(--surface-2)]">
              Efficiency
            </span>
          </div>
          <h3 className="text-xl font-bold text-[var(--surface)] mb-2 group-hover:text-[var(--accent-deep)] transition">
            Memory Compression &amp; Extraction Engine
          </h3>
          <p className="text-xs sm:text-sm text-[var(--fg-muted)] mb-6 leading-relaxed max-w-xl">
            Automatically isolates single-project revisions from universal creative preferences. When a creator says 
            &quot;make captions larger&quot;, Nue Memory classifies the rule, assigns high-signal priority, and commits it.
          </p>

          {/* Interactive Visual Element */}
          <div className="rounded-xl bg-[var(--surface)] border border-[var(--surface-2)] p-4 font-mono text-xs space-y-2">
            <div className="flex items-center justify-between text-[var(--fg-muted)] text-[10px] pb-2 border-b border-[var(--surface-2)]">
              <span>INPUT: CREATIVE FEEDBACK</span>
              <span className="text-[var(--accent-deep)] font-semibold">AUTONOMOUS EXTRACTION</span>
            </div>
            <p className="text-[var(--surface)] italic font-sans text-sm">
              &quot;The intro is too slow. Make the captions larger and remove this style of background music.&quot;
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
              <div className="bg-white border border-[var(--surface-2)] rounded-lg p-2.5 text-[11px] shadow-2xs">
                <span className="text-[var(--accent-deep)] block font-bold text-[10px]">[PACING]</span>
                <span className="text-[var(--surface)] font-medium">Fast 5s hook</span>
              </div>
              <div className="bg-white border border-[var(--surface-2)] rounded-lg p-2.5 text-[11px] shadow-2xs">
                <span className="text-[var(--accent-deep)] block font-bold text-[10px]">[CAPTIONS]</span>
                <span className="text-[var(--surface)] font-medium">Large high-contrast</span>
              </div>
              <div className="bg-white border border-[var(--surface-2)] rounded-lg p-2.5 text-[11px] shadow-2xs">
                <span className="text-[var(--accent-deep)] block font-bold text-[10px]">[MUSIC]</span>
                <span className="text-[var(--surface)] font-medium">Subtle modern bed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Total Prompt Visibility */}
        <div className="rounded-2xl bg-white border border-[var(--surface-2)] hover:border-[var(--accent)]/50 p-6 sm:p-8 transition-all duration-300 relative overflow-hidden group shadow-sm hover:shadow-xl hover:shadow-[var(--accent)]/5">
          <div className="flex items-center justify-between mb-5">
            <div className="w-11 h-11 rounded-xl bg-[var(--surface)] border border-[var(--surface-2)] flex items-center justify-center text-[var(--accent-deep)]">
              <Eye className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--fg-muted)] bg-[var(--surface)] px-3 py-1 rounded-md border border-[var(--surface-2)]">
              Visibility
            </span>
          </div>
          <h3 className="text-xl font-bold text-[var(--surface)] mb-2 group-hover:text-[var(--accent-deep)] transition">
            Context Orchestration Inspector
          </h3>
          <p className="text-xs sm:text-sm text-[var(--fg-muted)] mb-6 leading-relaxed">
            Never wonder why an AI agent generated a specific aesthetic. Full auditability with 3-stage prompt inspection.
          </p>

          <div className="space-y-2 font-mono text-[11px]">
            <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--surface-2)] flex items-center justify-between">
              <span className="text-[var(--fg-muted)]">1. Raw Creator Brief</span>
              <CheckCircle2 className="w-4 h-4 text-[var(--fg-muted)]" />
            </div>
            <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--accent)]/30 flex items-center justify-between">
              <span className="text-[var(--accent-deep)] font-semibold">2. Walrus MemWal Recall</span>
              <span className="text-[10px] bg-[var(--accent)]/20 text-[var(--accent-deep)] px-2 py-0.5 rounded font-bold">3 facts</span>
            </div>
            <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--surface-2)] flex items-center justify-between">
              <span className="text-[var(--fg-muted)]">3. Livepeer Enriched Brief</span>
              <CheckCircle2 className="w-4 h-4 text-[var(--accent-deep)]" />
            </div>
          </div>
        </div>

        {/* Card 3: Memory Evolution & Conflict Resolution */}
        <div className="rounded-2xl bg-white border border-[var(--surface-2)] hover:border-[var(--accent)]/50 p-6 sm:p-8 transition-all duration-300 relative overflow-hidden group shadow-sm hover:shadow-xl hover:shadow-[var(--accent)]/5">
          <div className="flex items-center justify-between mb-5">
            <div className="w-11 h-11 rounded-xl bg-[var(--surface)] border border-[var(--surface-2)] flex items-center justify-center text-[var(--accent-deep)]">
              <GitBranch className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--fg-muted)] bg-[var(--surface)] px-3 py-1 rounded-md border border-[var(--surface-2)]">
              Control
            </span>
          </div>
          <h3 className="text-xl font-bold text-[var(--surface)] mb-2 group-hover:text-[var(--accent-deep)] transition">
            Evolution &amp; Conflict Resolution
          </h3>
          <p className="text-xs sm:text-sm text-[var(--fg-muted)] mb-6 leading-relaxed">
            Creative tastes evolve. When a creator changes their mind, newly confirmed preferences automatically supersede 
            older contradictory ones via supersedesId.
          </p>

          <div className="rounded-xl bg-[var(--surface)] border border-[var(--surface-2)] p-3.5 space-y-2.5 font-mono text-[11px]">
            <div className="line-through text-[var(--fg-muted)] flex items-center justify-between">
              <span>v1: Fast pacing hook</span>
              <span className="text-[9px] uppercase text-[var(--fg-muted)] font-semibold">Superseded</span>
            </div>
            <div className="text-[var(--accent-deep)] flex items-center justify-between font-bold bg-white p-2 rounded border border-[var(--surface-2)]">
              <span>v2: Smooth cinematic slow-burn</span>
              <span className="text-[9px] uppercase bg-[var(--accent-deep)]/15 text-[var(--accent-deep)] px-2 py-0.5 rounded">Active</span>
            </div>
          </div>
        </div>

        {/* Card 4: Durable Walrus Storage on Sui (Spans 2 cols on lg) */}
        <div className="lg:col-span-2 rounded-2xl bg-white border border-[var(--surface-2)] hover:border-[var(--accent)]/50 p-6 sm:p-8 transition-all duration-300 relative overflow-hidden group shadow-sm hover:shadow-xl hover:shadow-[var(--accent)]/5">
          <div className="flex items-center justify-between mb-5">
            <div className="w-11 h-11 rounded-xl bg-[var(--surface)] border border-[var(--surface-2)] flex items-center justify-center text-[var(--accent-deep)]">
              <Database className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--fg-muted)] bg-[var(--surface)] px-3 py-1 rounded-md border border-[var(--surface-2)]">
              Decentralized
            </span>
          </div>
          <h3 className="text-xl font-bold text-[var(--surface)] mb-2 group-hover:text-[var(--accent-deep)] transition">
            Durable Walrus Storage via MemWal
          </h3>
          <p className="text-xs sm:text-sm text-[var(--fg-muted)] mb-6 leading-relaxed max-w-xl">
            Never locked into a proprietary database. Creator memories are stored as decentralized blobs 
            on Sui Walrus using the official MemWal SDK. Accessible by any compatible agent anytime.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
            <div className="p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--surface-2)]">
              <span className="text-[var(--fg-muted)] text-[10px] block mb-1">STORAGE ENGINE</span>
              <span className="text-[var(--surface)] font-bold">Walrus on Sui</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--surface-2)]">
              <span className="text-[var(--fg-muted)] text-[10px] block mb-1">SDK INTEGRATION</span>
              <span className="text-[var(--accent-deep)] font-bold">@mysten-incubation/memwal</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--surface-2)]">
              <span className="text-[var(--fg-muted)] text-[10px] block mb-1">DATA OWNERSHIP</span>
              <span className="text-[var(--surface)] font-bold">Creator Sovereignty</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
