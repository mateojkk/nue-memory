'use client';

import React from 'react';
import { Sparkles, ArrowRight, Layers, Database, ShieldCheck } from 'lucide-react';
import { MediaPreference } from '@/lib/types';

interface PromptOrchestratorViewProps {
  rawBrief: string;
  enrichedBrief: string;
  appliedMemories: MediaPreference[];
}

export function PromptOrchestratorView({
  rawBrief,
  enrichedBrief,
  appliedMemories,
}: PromptOrchestratorViewProps) {
  return (
    <div className="p-6 bg-[#09090b] rounded-2xl border border-white/5 font-mono text-xs">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#c88d51]" />
          <span className="font-bold text-white tracking-wide uppercase text-[11px]">
            Context Orchestration Pipeline (Zero-Reprompt Injection)
          </span>
        </div>
        <span className="text-[10px] text-[#ab9482] bg-white/5 px-2.5 py-1 rounded border border-white/5">
          Livepeer Agent MCP Pipeline
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Step 1: Raw Prompt */}
        <div className="flex flex-col bg-[#140e0b] border border-white/5 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3 text-[10px] text-[#ab9482]">
            <span>STAGE 01</span>
            <span className="text-zinc-500">USER INPUT</span>
          </div>
          <h4 className="text-white font-bold mb-2">Raw Creative Brief</h4>
          <p className="text-zinc-300 bg-[#0d0a08] p-3 rounded-lg border border-white/5 flex-1 leading-relaxed">
            &quot;{rawBrief}&quot;
          </p>
          <div className="mt-3 text-[10px] text-zinc-500">
            Zero mention of pacing, captions, or audio preferences.
          </div>
        </div>

        {/* Step 2: MemWal Recall */}
        <div className="flex flex-col bg-[#18120e] border border-[#c88d51]/25 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3 text-[10px] text-[#dda15e]">
            <span>STAGE 02</span>
            <span className="flex items-center gap-1 font-semibold">
              <Database className="w-3 h-3" /> WALRUS RECALL
            </span>
          </div>
          <h4 className="text-[#fbf7ee] font-bold mb-2">
            Retrieved MemWal Facts ({appliedMemories.length})
          </h4>
          <div className="space-y-2 flex-1 overflow-y-auto max-h-56">
            {appliedMemories.length === 0 ? (
              <p className="text-zinc-500 text-xs italic p-3">No active memories recalled.</p>
            ) : (
              appliedMemories.map((mem) => (
                <div key={mem.id} className="p-2.5 bg-[#120d0a] rounded-lg border border-[#c88d51]/15 text-[11px]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#c88d51]/20 text-[#dda15e] font-semibold">
                      {mem.category}
                    </span>
                    <span className="text-[9px] text-zinc-500">{mem.memwalBlobId || 'walrus-blob'}</span>
                  </div>
                  <p className="text-zinc-300">{mem.preference}</p>
                </div>
              ))
            )}
          </div>
          <div className="mt-3 text-[10px] text-[#dda15e] flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            Decentralized on Sui Walrus
          </div>
        </div>

        {/* Step 3: Enriched Livepeer Prompt */}
        <div className="flex flex-col bg-[#140e0b] border border-white/5 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3 text-[10px] text-[#dda15e]">
            <span>STAGE 03</span>
            <span className="text-zinc-500">LIVEPEER AGENT INJECTION</span>
          </div>
          <h4 className="text-white font-bold mb-2">Augmented MCP Prompt</h4>
          <pre className="text-zinc-300 bg-[#0d0a08] p-3 rounded-lg border border-white/5 flex-1 whitespace-pre-wrap text-[11px] leading-relaxed overflow-y-auto max-h-56">
            {enrichedBrief}
          </pre>
          <div className="mt-3 text-[10px] text-zinc-500 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#dda15e]" />
            Agent outputs video adhering to creator taste
          </div>
        </div>
      </div>
    </div>
  );
}
