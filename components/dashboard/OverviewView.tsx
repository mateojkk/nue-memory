'use client';

import React from 'react';
import { Database, Cpu, ShieldCheck, Zap, Layers, Sparkles, ArrowRight } from 'lucide-react';
import { MediaPreference } from '@/lib/types';

interface OverviewViewProps {
  memories: MediaPreference[];
  onOpenWorkspace: () => void;
  onOpenMemories: () => void;
}

export function OverviewView({ memories, onOpenWorkspace, onOpenMemories }: OverviewViewProps) {
  const activeCount = memories.filter((m) => m.isActive).length;
  const supersededCount = memories.filter((m) => !m.isActive).length;

  return (
    <div className="space-y-8 font-light text-left">
      {/* Header */}
      <div className="pb-6 border-b border-[#241f1a]">
        <div className="text-xs font-mono text-[#c88d51] uppercase tracking-wider mb-1">
          Infrastructure Telemetry
        </div>
        <h2 className="text-2xl sm:text-3xl font-medium text-white tracking-tight font-sans">
          Nue Memory System Overview
        </h2>
        <p className="text-stone-400 text-xs sm:text-sm mt-1">
          Decoupled memory intelligence layer bridging AI agent runtimes with Sui Walrus decentralized storage.
        </p>
      </div>

      {/* Connectivity Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-5 rounded-xl bg-[#141210] border border-[#26211d] space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-stone-500">
            <span>STORAGE BACKEND</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="text-lg font-medium text-white font-sans">Sui Walrus (MemWal)</div>
          <div className="text-xs text-stone-400 font-light">
            Decentralized blob persistence active · Zero model lock-in
          </div>
        </div>

        <div className="p-5 rounded-xl bg-[#141210] border border-[#26211d] space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-stone-500">
            <span>MEDIA EXECUTION</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="text-lg font-medium text-white font-sans">Livepeer Agent MCP</div>
          <div className="text-xs text-stone-400 font-light">
            Remote MCP tool connected · Context-augmented generation
          </div>
        </div>

        <div className="p-5 rounded-xl bg-[#141210] border border-[#26211d] space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-stone-500">
            <span>MEMORY INTELLIGENCE</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="text-lg font-medium text-white font-sans">Nue Evolution Engine</div>
          <div className="text-xs text-stone-400 font-light">
            Extraction, noise filtering &amp; supersession pointers active
          </div>
        </div>
      </div>

      {/* Quick Stats & Launch Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8 p-6 rounded-xl bg-[#141210] border border-[#26211d] space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[#211b17]">
            <span className="text-xs font-mono text-stone-400 uppercase tracking-wider">
              Memory Ledger Summary
            </span>
            <button
              onClick={onOpenMemories}
              className="text-xs font-mono text-[#c88d51] hover:text-white transition flex items-center gap-1"
            >
              <span>View All Records</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 font-mono text-center">
            <div className="p-4 rounded-lg bg-[#181512] border border-[#29221b]">
              <span className="text-2xl font-medium text-white block">{activeCount}</span>
              <span className="text-[11px] text-stone-400 block mt-1">Active Preferences</span>
            </div>
            <div className="p-4 rounded-lg bg-[#181512] border border-[#29221b]">
              <span className="text-2xl font-medium text-stone-300 block">{supersededCount}</span>
              <span className="text-[11px] text-stone-400 block mt-1">Superseded Records</span>
            </div>
            <div className="p-4 rounded-lg bg-[#181512] border border-[#29221b]">
              <span className="text-2xl font-medium text-emerald-400 block">100%</span>
              <span className="text-[11px] text-stone-400 block mt-1">Durable Walrus Blobs</span>
            </div>
          </div>

          <div className="text-xs text-stone-400 font-light leading-relaxed">
            Nue sits between your AI agents and decentralized storage. When users express preferences, Nue parses what matters and keeps context sharp across any number of subsequent runs.
          </div>
        </div>

        {/* Media Memory Fast Launch */}
        <div className="lg:col-span-4 p-6 rounded-xl bg-[#181512] border border-[#c88d51]/40 flex flex-col justify-between shadow-lg shadow-[#c88d51]/5">
          <div className="space-y-2">
            <span className="text-[11px] font-mono text-[#c88d51] uppercase tracking-wider block">
              Flagship Feature
            </span>
            <h3 className="text-xl font-medium text-white font-sans">Media Memory</h3>
            <p className="text-xs text-stone-400 font-light leading-relaxed">
              Test the end-to-end loop: generate media with Livepeer Agent, submit feedback, store preferences, and experience zero-reprompt recall in a new project.
            </p>
          </div>

          <button
            onClick={onOpenWorkspace}
            className="w-full mt-6 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-[#ededed] hover:bg-white text-[#0c0a09] text-xs font-medium transition shadow-md"
          >
            <span>Launch Media Studio</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
