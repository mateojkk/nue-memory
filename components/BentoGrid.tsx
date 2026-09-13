'use client';

import React from 'react';
import { Cpu, Eye, GitBranch, Database, CheckCircle2 } from 'lucide-react';

export function BentoGrid() {
  return (
    <section id="features" className="py-24 px-4 max-w-7xl mx-auto">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#18120e] border border-[#c88d51]/25 text-[#dda15e] text-xs font-mono font-medium mb-4">
          <Cpu className="w-3.5 h-3.5" />
          <span>Core Capabilities</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
          Built for creators who want{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#dda15e] via-[#fbf7ee] to-[#c88d51]">
            proof, not promises
          </span>
        </h2>
        <p className="text-sm sm:text-base text-[#ab9482] leading-relaxed">
          Traditional AI video tools suffer from creative amnesia. Nue Memory introduces an autonomous memory layer 
          that extracts, evolves, and injects creative preferences without configuration.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Card 1: Memory Compression & Extraction (Spans 2 cols on lg) */}
        <div className="lg:col-span-2 rounded-2xl bg-[#09090b] border border-white/10 hover:border-[#c88d51]/40 p-6 sm:p-8 transition duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-80 h-80 bg-radial from-[#c88d51]/10 to-transparent blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-5">
            <div className="w-10 h-10 rounded-xl bg-[#18120e] border border-[#c88d51]/30 flex items-center justify-center text-[#dda15e]">
              <Cpu className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#ab9482] bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
              Efficiency
            </span>
          </div>
          <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#dda15e] transition">
            Memory Compression &amp; Extraction Engine
          </h3>
          <p className="text-xs sm:text-sm text-[#ab9482] mb-6 leading-relaxed max-w-xl">
            Automatically isolates single-project revisions from universal creative preferences. When a creator says 
            &quot;make captions larger&quot;, Nue Memory classifies the rule, assigns high-signal priority, and commits it.
          </p>

          {/* Interactive Visual Element */}
          <div className="rounded-xl bg-[#12100e] border border-white/5 p-4 font-mono text-xs space-y-2">
            <div className="flex items-center justify-between text-[#786152] text-[10px] pb-2 border-b border-white/5">
              <span>INPUT: CREATIVE FEEDBACK</span>
              <span className="text-[#dda15e]">AUTONOMOUS EXTRACTION</span>
            </div>
            <p className="text-[#cbbba8] italic">
              &quot;The intro is too slow. Make the captions larger and remove this style of background music.&quot;
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
              <div className="bg-[#18120e] border border-[#c88d51]/20 rounded-lg p-2 text-[11px]">
                <span className="text-[#dda15e] block font-semibold text-[10px]">[PACING]</span>
                <span className="text-zinc-300">Fast 5s hook</span>
              </div>
              <div className="bg-[#18120e] border border-[#c88d51]/20 rounded-lg p-2 text-[11px]">
                <span className="text-[#dda15e] block font-semibold text-[10px]">[CAPTIONS]</span>
                <span className="text-zinc-300">Large high-contrast</span>
              </div>
              <div className="bg-[#18120e] border border-[#c88d51]/20 rounded-lg p-2 text-[11px]">
                <span className="text-[#dda15e] block font-semibold text-[10px]">[MUSIC]</span>
                <span className="text-zinc-300">Subtle modern bed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Total Prompt Visibility */}
        <div className="rounded-2xl bg-[#09090b] border border-white/10 hover:border-[#c88d51]/40 p-6 sm:p-8 transition duration-300 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-5">
            <div className="w-10 h-10 rounded-xl bg-[#18120e] border border-[#c88d51]/30 flex items-center justify-center text-[#dda15e]">
              <Eye className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#ab9482] bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
              Visibility
            </span>
          </div>
          <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#dda15e] transition">
            Context Orchestration Inspector
          </h3>
          <p className="text-xs sm:text-sm text-[#ab9482] mb-6 leading-relaxed">
            Never wonder why an AI agent generated a specific aesthetic. Full auditability with 3-stage prompt inspection.
          </p>

          <div className="space-y-2 font-mono text-[11px]">
            <div className="p-2.5 rounded-lg bg-[#140e0b] border border-white/5 flex items-center justify-between">
              <span className="text-zinc-400">1. Raw Creator Brief</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500" />
            </div>
            <div className="p-2.5 rounded-lg bg-[#18120e] border border-[#c88d51]/25 flex items-center justify-between">
              <span className="text-[#dda15e]">2. Walrus MemWal Recall</span>
              <span className="text-[10px] bg-[#c88d51]/20 text-[#dda15e] px-1.5 py-0.5 rounded">3 facts</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#140e0b] border border-white/5 flex items-center justify-between">
              <span className="text-zinc-400">3. Livepeer Enriched Brief</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-[#dda15e]" />
            </div>
          </div>
        </div>

        {/* Card 3: Memory Evolution & Conflict Resolution */}
        <div className="rounded-2xl bg-[#09090b] border border-white/10 hover:border-[#c88d51]/40 p-6 sm:p-8 transition duration-300 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-5">
            <div className="w-10 h-10 rounded-xl bg-[#18120e] border border-[#c88d51]/30 flex items-center justify-center text-[#dda15e]">
              <GitBranch className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#ab9482] bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
              Control
            </span>
          </div>
          <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#dda15e] transition">
            Evolution &amp; Conflict Resolution
          </h3>
          <p className="text-xs sm:text-sm text-[#ab9482] mb-6 leading-relaxed">
            Creative tastes evolve. When a creator changes their mind, newly confirmed preferences automatically supersede 
            older contradictory ones via supersedesId.
          </p>

          <div className="rounded-xl bg-[#12100e] border border-white/5 p-3 space-y-2 font-mono text-[11px]">
            <div className="line-through text-zinc-600 flex items-center justify-between">
              <span>v1: Fast pacing hook</span>
              <span className="text-[9px] uppercase text-zinc-600">Superseded</span>
            </div>
            <div className="text-[#dda15e] flex items-center justify-between font-semibold">
              <span>v2: Smooth cinematic slow-burn</span>
              <span className="text-[9px] uppercase bg-[#c88d51]/20 text-[#dda15e] px-1.5 py-0.5 rounded">Active</span>
            </div>
          </div>
        </div>

        {/* Card 4: Durable Walrus Storage on Sui (Spans 2 cols on lg) */}
        <div className="lg:col-span-2 rounded-2xl bg-[#09090b] border border-white/10 hover:border-[#c88d51]/40 p-6 sm:p-8 transition duration-300 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-5">
            <div className="w-10 h-10 rounded-xl bg-[#18120e] border border-[#c88d51]/30 flex items-center justify-center text-[#dda15e]">
              <Database className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#ab9482] bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
              Decentralized
            </span>
          </div>
          <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#dda15e] transition">
            Durable Walrus Storage via MemWal
          </h3>
          <p className="text-xs sm:text-sm text-[#ab9482] mb-6 leading-relaxed max-w-xl">
            Never locked into a centralized proprietary database. Creator memories are stored as decentralized blobs 
            on Sui Walrus using the official MemWal SDK. Accessible by any compatible agent anytime.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
            <div className="p-3 rounded-xl bg-[#140e0b] border border-white/5">
              <span className="text-[#786152] text-[10px] block mb-1">STORAGE ENGINE</span>
              <span className="text-white font-semibold">Walrus on Sui</span>
            </div>
            <div className="p-3 rounded-xl bg-[#140e0b] border border-white/5">
              <span className="text-[#786152] text-[10px] block mb-1">SDK INTEGRATION</span>
              <span className="text-[#dda15e] font-semibold">@mysten-incubation/memwal</span>
            </div>
            <div className="p-3 rounded-xl bg-[#140e0b] border border-white/5">
              <span className="text-[#786152] text-[10px] block mb-1">DATA OWNERSHIP</span>
              <span className="text-white font-semibold">Creator Sovereignty</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
