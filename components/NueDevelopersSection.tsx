'use client';

import React, { useState } from 'react';
import { Check, ArrowRight } from 'lucide-react';

export function NueDevelopersSection() {
  const [activeTab, setActiveTab] = useState<'efficiency' | 'visibility' | 'control'>('efficiency');

  return (
    <section id="features" className="py-24 px-4 bg-[#0d0a08] text-white relative overflow-hidden border-t border-stone-800">
      {/* Background Dot Mesh */}
      <div 
        className="absolute inset-0 opacity-[0.15] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#c88d51 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* 2-Column Header (Exact mem0 Image 3 layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end mb-16">
          <div className="lg:col-span-7">
            <h2 className="text-3xl sm:text-5xl md:text-[54px] font-extrabold tracking-tight text-white leading-[1.12] font-sans">
              Built for <span className="font-mono text-[#c88d51]">&lt;creators&gt;</span> <br />
              who want proof, <br />
              not promises
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="text-stone-400 text-base sm:text-lg leading-relaxed font-normal">
              Nue gives agents persistent memory without pipeline changes. Less redundant context, 
              lower token costs, measurably faster video generations.
            </p>
          </div>
        </div>

        {/* macOS Dark Window (Exact mem0 Image 3 layout) */}
        <div className="rounded-2xl bg-[#14110f] border border-stone-800 shadow-2xl overflow-hidden">
          {/* Window Title Bar */}
          <div className="px-5 py-3.5 bg-[#181412] border-b border-stone-800 flex items-center justify-between">
            {/* macOS Dots */}
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
              <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
              <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
            </div>

            {/* Window Center Title: Nue */}
            <span className="text-xs font-mono text-stone-400 font-semibold">Nue</span>

            {/* Top Right Action: Try Nue now */}
            <a
              href="#studio"
              className="text-xs font-semibold text-stone-400 hover:text-white transition flex items-center gap-1"
            >
              <span>Try Nue now</span>
              <ArrowRight className="w-3 h-3" />
            </a>
          </div>

          {/* Window Tabs Bar (Exact Image 3 Tabs: Efficiency ○ | Visibility ○ | Control ○) */}
          <div className="grid grid-cols-3 border-b border-stone-800 text-xs font-mono">
            <button
              onClick={() => setActiveTab('efficiency')}
              className={`py-3.5 px-4 flex items-center justify-between transition border-r border-stone-800 ${
                activeTab === 'efficiency'
                  ? 'bg-[#1e1916] text-white font-bold'
                  : 'text-stone-400 hover:text-white bg-[#14110f]'
              }`}
            >
              <span>Efficiency</span>
              <span
                className={`w-2.5 h-2.5 rounded-full border ${
                  activeTab === 'efficiency'
                    ? 'border-[#c88d51] bg-[#c88d51]/20'
                    : 'border-stone-600'
                }`}
              />
            </button>

            <button
              onClick={() => setActiveTab('visibility')}
              className={`py-3.5 px-4 flex items-center justify-between transition border-r border-stone-800 ${
                activeTab === 'visibility'
                  ? 'bg-[#1e1916] text-white font-bold'
                  : 'text-stone-400 hover:text-white bg-[#14110f]'
              }`}
            >
              <span>Visibility</span>
              <span
                className={`w-2.5 h-2.5 rounded-full border ${
                  activeTab === 'visibility'
                    ? 'border-[#c88d51] bg-[#c88d51]/20'
                    : 'border-stone-600'
                }`}
              />
            </button>

            <button
              onClick={() => setActiveTab('control')}
              className={`py-3.5 px-4 flex items-center justify-between transition ${
                activeTab === 'control'
                  ? 'bg-[#1e1916] text-white font-bold'
                  : 'text-stone-400 hover:text-white bg-[#14110f]'
              }`}
            >
              <span>Control</span>
              <span
                className={`w-2.5 h-2.5 rounded-full border ${
                  activeTab === 'control'
                    ? 'border-[#c88d51] bg-[#c88d51]/20'
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
                  <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-sans">
                    Memory Compression Engine
                  </h3>
                  <p className="text-stone-400 text-sm sm:text-base leading-relaxed">
                    Automatically condenses creative feedback and chat history into compact memories that cut tokens and latency while keeping visual fidelity.
                  </p>
                  <div className="pt-4 flex items-center gap-6 font-mono text-xs text-stone-300">
                    <div>
                      <span className="text-[#c88d51] text-lg font-bold block">78%</span>
                      <span className="text-stone-500 text-[11px]">Context Token Reduction</span>
                    </div>
                    <div>
                      <span className="text-white text-lg font-bold block">&lt;15ms</span>
                      <span className="text-stone-500 text-[11px]">MemWal Recall Latency</span>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'visibility' && (
                <>
                  <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-sans">
                    Decentralized Context Auditor
                  </h3>
                  <p className="text-stone-400 text-sm sm:text-base leading-relaxed">
                    Every retrieved preference is cryptographically traceable back to its Sui Walrus blob ID. No opaque black boxes, no unexpected model hallucinations.
                  </p>
                  <div className="pt-4 flex items-center gap-6 font-mono text-xs text-stone-300">
                    <div>
                      <span className="text-[#c88d51] text-lg font-bold block">100%</span>
                      <span className="text-stone-500 text-[11px]">Prompt Traceability</span>
                    </div>
                    <div>
                      <span className="text-white text-lg font-bold block">Sui Walrus</span>
                      <span className="text-stone-500 text-[11px]">Decentralized Blobs</span>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'control' && (
                <>
                  <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-sans">
                    Conflict Evolution Engine
                  </h3>
                  <p className="text-stone-400 text-sm sm:text-base leading-relaxed">
                    Creative tastes evolve. When a director changes their mind, newly confirmed preferences automatically supersede conflicting older ones without breaking historical records.
                  </p>
                  <div className="pt-4 flex items-center gap-6 font-mono text-xs text-stone-300">
                    <div>
                      <span className="text-[#c88d51] text-lg font-bold block">Auto</span>
                      <span className="text-stone-500 text-[11px]">Supersession Graph</span>
                    </div>
                    <div>
                      <span className="text-white text-lg font-bold block">Zero</span>
                      <span className="text-stone-500 text-[11px]">Prompt Pollution</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Right Column: Visual Graphic (Exact mem0 Image 3 Diagram) */}
            <div className="lg:col-span-6">
              <div className="rounded-2xl bg-[#d4a373]/15 border border-[#c88d51]/30 p-6 sm:p-8 relative overflow-hidden flex flex-col items-center justify-center min-h-[300px]">
                <div 
                  className="absolute inset-0 opacity-[0.2] pointer-events-none"
                  style={{
                    backgroundImage: 'radial-gradient(#c88d51 1px, transparent 1px)',
                    backgroundSize: '16px 16px',
                  }}
                />

                <div className="w-full max-w-sm rounded-2xl bg-[#1c1815] border border-stone-800 p-4 shadow-xl relative z-10 space-y-3">
                  {/* User Message (Pill with warm brown tint) */}
                  <div className="flex justify-end">
                    <div className="rounded-2xl rounded-tr-xs bg-[#b87333]/30 border border-[#b87333]/50 text-stone-100 text-xs px-3.5 py-2.5 max-w-[90%] leading-relaxed font-sans">
                      &quot;Dynamic fast-paced 9:16 vertical, warm golden hour palette, no heavy brass music.&quot;
                    </div>
                  </div>

                  {/* Agent Response (Dark bubble) */}
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-tl-xs bg-[#29221d] text-stone-300 text-xs px-3.5 py-2.5 max-w-[90%] leading-relaxed font-sans">
                      &quot;Perfect, that gives me everything I need for your commercial video campaign.&quot;
                    </div>
                  </div>

                  {/* Downward connector lines pointing to SAVED pill */}
                  <div className="pt-2 flex flex-col items-center">
                    <div className="w-px h-4 bg-[#c88d51]/60" />
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fbf2e9] text-[#18120e] text-[11px] font-bold font-mono shadow-md border border-[#e8d5c4]">
                      <Check className="w-3.5 h-3.5 text-[#9c4e1f]" />
                      <span>SAVED ON WALRUS</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
