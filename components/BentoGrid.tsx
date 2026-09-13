'use client';

import React from 'react';
import { Cpu, Eye, GitBranch, Database, CheckCircle2 } from 'lucide-react';

export function BentoGrid() {
  return (
    <section id="features" className="py-24 px-4 max-w-7xl mx-auto">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#f5ece4] border border-[#e2d5c5] text-[#78350f] text-xs font-mono font-semibold mb-4">
          <Cpu className="w-3.5 h-3.5" />
          <span>Core Capabilities</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#18120e] mb-4">
          Built for creators who want{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9c4e1f] via-[#c88d51] to-[#b45a27]">
            proof, not promises
          </span>
        </h2>
        <p className="text-sm sm:text-base text-[#786152] leading-relaxed">
          Traditional AI media agents suffer from creative amnesia. Nue Memory introduces an autonomous memory layer 
          that extracts, evolves, and injects creative preferences on Sui Walrus without configuration.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Memory Compression & Extraction (Spans 2 cols on lg) */}
        <div className="lg:col-span-2 rounded-2xl bg-white border border-[#e7e2da] hover:border-[#c88d51]/50 p-6 sm:p-8 transition-all duration-300 relative overflow-hidden group shadow-sm hover:shadow-xl hover:shadow-[#c88d51]/5">
          <div className="flex items-center justify-between mb-5">
            <div className="w-11 h-11 rounded-xl bg-[#f5ece4] border border-[#e2d5c5] flex items-center justify-center text-[#9c4e1f]">
              <Cpu className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#786152] bg-[#f5ece4] px-3 py-1 rounded-md border border-[#e2d5c5]">
              Efficiency
            </span>
          </div>
          <h3 className="text-xl font-bold text-[#18120e] mb-2 group-hover:text-[#9c4e1f] transition">
            Memory Compression &amp; Extraction Engine
          </h3>
          <p className="text-xs sm:text-sm text-[#786152] mb-6 leading-relaxed max-w-xl">
            Automatically isolates single-project revisions from universal creative preferences. When a creator says 
            &quot;make captions larger&quot;, Nue Memory classifies the rule, assigns high-signal priority, and commits it.
          </p>

          {/* Interactive Visual Element */}
          <div className="rounded-xl bg-[#faf6f0] border border-[#e2d5c5] p-4 font-mono text-xs space-y-2">
            <div className="flex items-center justify-between text-[#786152] text-[10px] pb-2 border-b border-[#e7e2da]">
              <span>INPUT: CREATIVE FEEDBACK</span>
              <span className="text-[#9c4e1f] font-semibold">AUTONOMOUS EXTRACTION</span>
            </div>
            <p className="text-[#18120e] italic font-sans text-sm">
              &quot;The intro is too slow. Make the captions larger and remove this style of background music.&quot;
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
              <div className="bg-white border border-[#e2d5c5] rounded-lg p-2.5 text-[11px] shadow-2xs">
                <span className="text-[#9c4e1f] block font-bold text-[10px]">[PACING]</span>
                <span className="text-[#18120e] font-medium">Fast 5s hook</span>
              </div>
              <div className="bg-white border border-[#e2d5c5] rounded-lg p-2.5 text-[11px] shadow-2xs">
                <span className="text-[#9c4e1f] block font-bold text-[10px]">[CAPTIONS]</span>
                <span className="text-[#18120e] font-medium">Large high-contrast</span>
              </div>
              <div className="bg-white border border-[#e2d5c5] rounded-lg p-2.5 text-[11px] shadow-2xs">
                <span className="text-[#9c4e1f] block font-bold text-[10px]">[MUSIC]</span>
                <span className="text-[#18120e] font-medium">Subtle modern bed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Total Prompt Visibility */}
        <div className="rounded-2xl bg-white border border-[#e7e2da] hover:border-[#c88d51]/50 p-6 sm:p-8 transition-all duration-300 relative overflow-hidden group shadow-sm hover:shadow-xl hover:shadow-[#c88d51]/5">
          <div className="flex items-center justify-between mb-5">
            <div className="w-11 h-11 rounded-xl bg-[#f5ece4] border border-[#e2d5c5] flex items-center justify-center text-[#9c4e1f]">
              <Eye className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#786152] bg-[#f5ece4] px-3 py-1 rounded-md border border-[#e2d5c5]">
              Visibility
            </span>
          </div>
          <h3 className="text-xl font-bold text-[#18120e] mb-2 group-hover:text-[#9c4e1f] transition">
            Context Orchestration Inspector
          </h3>
          <p className="text-xs sm:text-sm text-[#786152] mb-6 leading-relaxed">
            Never wonder why an AI agent generated a specific aesthetic. Full auditability with 3-stage prompt inspection.
          </p>

          <div className="space-y-2 font-mono text-[11px]">
            <div className="p-3 rounded-lg bg-[#faf6f0] border border-[#e2d5c5] flex items-center justify-between">
              <span className="text-[#786152]">1. Raw Creator Brief</span>
              <CheckCircle2 className="w-4 h-4 text-stone-400" />
            </div>
            <div className="p-3 rounded-lg bg-[#f5ece4] border border-[#c88d51]/30 flex items-center justify-between">
              <span className="text-[#78350f] font-semibold">2. Walrus MemWal Recall</span>
              <span className="text-[10px] bg-[#c88d51]/20 text-[#78350f] px-2 py-0.5 rounded font-bold">3 facts</span>
            </div>
            <div className="p-3 rounded-lg bg-[#faf6f0] border border-[#e2d5c5] flex items-center justify-between">
              <span className="text-[#786152]">3. Livepeer Enriched Brief</span>
              <CheckCircle2 className="w-4 h-4 text-[#9c4e1f]" />
            </div>
          </div>
        </div>

        {/* Card 3: Memory Evolution & Conflict Resolution */}
        <div className="rounded-2xl bg-white border border-[#e7e2da] hover:border-[#c88d51]/50 p-6 sm:p-8 transition-all duration-300 relative overflow-hidden group shadow-sm hover:shadow-xl hover:shadow-[#c88d51]/5">
          <div className="flex items-center justify-between mb-5">
            <div className="w-11 h-11 rounded-xl bg-[#f5ece4] border border-[#e2d5c5] flex items-center justify-center text-[#9c4e1f]">
              <GitBranch className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#786152] bg-[#f5ece4] px-3 py-1 rounded-md border border-[#e2d5c5]">
              Control
            </span>
          </div>
          <h3 className="text-xl font-bold text-[#18120e] mb-2 group-hover:text-[#9c4e1f] transition">
            Evolution &amp; Conflict Resolution
          </h3>
          <p className="text-xs sm:text-sm text-[#786152] mb-6 leading-relaxed">
            Creative tastes evolve. When a creator changes their mind, newly confirmed preferences automatically supersede 
            older contradictory ones via supersedesId.
          </p>

          <div className="rounded-xl bg-[#faf6f0] border border-[#e2d5c5] p-3.5 space-y-2.5 font-mono text-[11px]">
            <div className="line-through text-stone-400 flex items-center justify-between">
              <span>v1: Fast pacing hook</span>
              <span className="text-[9px] uppercase text-stone-400 font-semibold">Superseded</span>
            </div>
            <div className="text-[#78350f] flex items-center justify-between font-bold bg-white p-2 rounded border border-[#e2d5c5]">
              <span>v2: Smooth cinematic slow-burn</span>
              <span className="text-[9px] uppercase bg-[#9c4e1f]/15 text-[#9c4e1f] px-2 py-0.5 rounded">Active</span>
            </div>
          </div>
        </div>

        {/* Card 4: Durable Walrus Storage on Sui (Spans 2 cols on lg) */}
        <div className="lg:col-span-2 rounded-2xl bg-white border border-[#e7e2da] hover:border-[#c88d51]/50 p-6 sm:p-8 transition-all duration-300 relative overflow-hidden group shadow-sm hover:shadow-xl hover:shadow-[#c88d51]/5">
          <div className="flex items-center justify-between mb-5">
            <div className="w-11 h-11 rounded-xl bg-[#f5ece4] border border-[#e2d5c5] flex items-center justify-center text-[#9c4e1f]">
              <Database className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#786152] bg-[#f5ece4] px-3 py-1 rounded-md border border-[#e2d5c5]">
              Decentralized
            </span>
          </div>
          <h3 className="text-xl font-bold text-[#18120e] mb-2 group-hover:text-[#9c4e1f] transition">
            Durable Walrus Storage via MemWal
          </h3>
          <p className="text-xs sm:text-sm text-[#786152] mb-6 leading-relaxed max-w-xl">
            Never locked into a proprietary database. Creator memories are stored as decentralized blobs 
            on Sui Walrus using the official MemWal SDK. Accessible by any compatible agent anytime.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
            <div className="p-3.5 rounded-xl bg-[#faf6f0] border border-[#e2d5c5]">
              <span className="text-[#786152] text-[10px] block mb-1">STORAGE ENGINE</span>
              <span className="text-[#18120e] font-bold">Walrus on Sui</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#faf6f0] border border-[#e2d5c5]">
              <span className="text-[#786152] text-[10px] block mb-1">SDK INTEGRATION</span>
              <span className="text-[#9c4e1f] font-bold">@mysten-incubation/memwal</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#faf6f0] border border-[#e2d5c5]">
              <span className="text-[#786152] text-[10px] block mb-1">DATA OWNERSHIP</span>
              <span className="text-[#18120e] font-bold">Creator Sovereignty</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
