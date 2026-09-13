'use client';

import React from 'react';
import { X, Sparkles, Send, Layers } from 'lucide-react';
import { MediaPreference } from '@/lib/types';

interface EnrichedBriefModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawBrief: string;
  enrichedBrief: string;
  appliedMemories: MediaPreference[];
}

export const EnrichedBriefModal: React.FC<EnrichedBriefModalProps> = ({
  isOpen,
  onClose,
  rawBrief,
  enrichedBrief,
  appliedMemories,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white border border-[#e7e2da] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#e7e2da] flex items-center justify-between bg-[#faf6f0]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#f5ece4] border border-[#e2d5c5] flex items-center justify-center text-[#9c4e1f]">
              <Sparkles className="w-4 h-4 text-[#9c4e1f]" />
            </div>
            <div>
              <h3 className="text-xs font-medium text-[#18120e]">
                Context Orchestration Inspector
              </h3>
              <p className="text-[10px] text-[#786152] font-mono">
                MemWal vector retrieval → Livepeer Agent MCP injection pipeline
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-stone-400 hover:text-[#18120e] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh] bg-white">
          {/* Step 1: User's raw request */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono font-medium text-[#786152] uppercase tracking-wider flex items-center gap-1.5">
                <Send className="w-3 h-3 text-[#9c4e1f]" />
                Stage 1 · Original User Creative Brief
              </span>
              <span className="text-[10px] font-mono text-stone-400">Zero-reprompt</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#faf6f0] border border-[#e7e2da] text-xs font-mono text-[#18120e]">
              &quot;{rawBrief}&quot;
            </div>
          </div>

          {/* Step 2: Retrieved preferences */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono font-medium text-[#786152] uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-[#9c4e1f]" />
                Stage 2 · Retrieved Walrus Memories ({appliedMemories.length})
              </span>
              <span className="text-[10px] font-mono text-[#9c4e1f] font-medium bg-[#f5ece4] px-2 py-0.5 rounded border border-[#e2d5c5]">
                MemWal Match
              </span>
            </div>
            <div className="space-y-1.5">
              {appliedMemories.length === 0 ? (
                <div className="p-3 rounded-xl bg-[#faf6f0] border border-[#e7e2da] text-xs text-stone-400 font-mono italic">
                  No previous preferences matched.
                </div>
              ) : (
                appliedMemories.map((pref) => (
                  <div
                    key={pref.id}
                    className="p-2.5 rounded-xl bg-[#fdfbf7] border border-[#c88d51]/25 flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[9px] uppercase font-medium bg-[#f5ece4] text-[#78350f]">
                        {pref.category}
                      </span>
                      <span className="text-[#18120e] font-medium">{pref.preference}</span>
                    </div>
                    <span className="text-[10px] text-stone-400 shrink-0 ml-2">
                      {pref.memwalBlobId || 'walrus-blob'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Step 3: Enriched final prompt */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono font-medium text-[#786152] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-[#9c4e1f]" />
                Stage 3 · Final Augmented Livepeer Agent Directives
              </span>
              <span className="text-[10px] font-mono text-emerald-600 font-medium">Live Remote MCP</span>
            </div>
            <pre className="p-3.5 rounded-xl bg-[#140e0b] border border-[#281c15] text-[#fbf7ee] text-xs font-mono whitespace-pre-wrap leading-relaxed">
              {enrichedBrief}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#e7e2da] bg-[#faf6f0] flex items-center justify-between text-xs font-mono text-[#786152]">
          <span>Autonomous Prompt Orchestrator</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-md bg-[#1a120c] text-white hover:bg-[#281c15] font-medium text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
