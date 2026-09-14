'use client';

import React from 'react';
import { Sparkles, Layers, Database, ShieldCheck } from 'lucide-react';
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
    <div className="p-6 bg-white rounded-2xl border border-[var(--surface-2)] font-mono text-xs shadow-sm">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--surface-2)]">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[var(--accent-deep)]" />
          <span className="font-bold text-[var(--surface)] tracking-wide uppercase text-[11px]">
            Context Orchestration Pipeline (Zero-Reprompt Injection)
          </span>
        </div>
        <span className="text-[10px] text-[var(--fg-muted)] bg-[var(--surface)] px-2.5 py-1 rounded border border-[var(--surface-2)]">
          Livepeer Agent MCP Pipeline
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Step 1: Raw Prompt */}
        <div className="flex flex-col bg-[var(--surface)] border border-[var(--surface-2)] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3 text-[10px] text-[var(--fg-muted)]">
            <span>STAGE 01</span>
            <span className="text-[var(--fg-muted)]">USER INPUT</span>
          </div>
          <h4 className="text-[var(--surface)] font-bold mb-2">Raw Creative Brief</h4>
          <p className="text-[var(--surface)] bg-white p-3 rounded-lg border border-[var(--surface-2)] flex-1 leading-relaxed font-sans text-xs">
            &quot;{rawBrief}&quot;
          </p>
          <div className="mt-3 text-[10px] text-[var(--fg-faint)]">
            Zero mention of pacing, captions, or audio preferences.
          </div>
        </div>

        {/* Step 2: MemWal Recall */}
        <div className="flex flex-col bg-[var(--surface)] border border-[var(--accent)]/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3 text-[10px] text-[var(--accent-deep)]">
            <span>STAGE 02</span>
            <span className="flex items-center gap-1 font-bold">
              <Database className="w-3 h-3" /> WALRUS RECALL
            </span>
          </div>
          <h4 className="text-[var(--surface)] font-bold mb-2">
            Retrieved MemWal Facts ({appliedMemories.length})
          </h4>
          <div className="space-y-2 flex-1 overflow-y-auto max-h-56">
            {appliedMemories.length === 0 ? (
              <p className="text-[var(--fg-muted)] text-xs italic p-3">No active memories recalled.</p>
            ) : (
              appliedMemories.map((mem) => (
                <div key={mem.id} className="p-2.5 bg-white rounded-lg border border-[var(--surface-2)] text-[11px] shadow-2xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-[var(--surface)] text-[var(--accent-deep)] font-bold">
                      {mem.category}
                    </span>
                    <span className="text-[9px] text-[var(--fg-muted)]">{mem.memwalBlobId || 'walrus-blob'}</span>
                  </div>
                  <p className="text-[var(--surface)]">{mem.preference}</p>
                </div>
              ))
            )}
          </div>
          <div className="mt-3 text-[10px] text-[var(--accent-deep)] flex items-center gap-1 font-semibold">
            <ShieldCheck className="w-3 h-3" />
            Decentralized on Sui Walrus
          </div>
        </div>

        {/* Step 3: Enriched Livepeer Prompt */}
        <div className="flex flex-col bg-[var(--surface)] border border-[var(--surface-2)] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3 text-[10px] text-[var(--accent-deep)]">
            <span>STAGE 03</span>
            <span className="text-[var(--fg-muted)] font-semibold">LIVEPEER AGENT INJECTION</span>
          </div>
          <h4 className="text-[var(--surface)] font-bold mb-2">Augmented MCP Prompt</h4>
          <pre className="text-[var(--surface)] bg-white p-3 rounded-lg border border-[var(--surface-2)] flex-1 whitespace-pre-wrap text-[11px] leading-relaxed overflow-y-auto max-h-56">
            {enrichedBrief}
          </pre>
          <div className="mt-3 text-[10px] text-[var(--accent-deep)] flex items-center gap-1 font-semibold">
            <Sparkles className="w-3 h-3 text-[var(--accent-deep)]" />
            Agent outputs video adhering to creator taste
          </div>
        </div>
      </div>
    </div>
  );
}
