'use client';

import React from 'react';
import { X, Sparkles, Send, Layers, Terminal } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#0e0a08] border border-[#c88d51]/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-[#0d0a08]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#1e1510] border border-[#c88d51]/30 flex items-center justify-center text-[#dda15e]">
              <Sparkles className="w-3.5 h-3.5 text-[#c88d51]" />
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                Nue Memory · Context Orchestration Inspector
              </h3>
              <p className="text-[10px] text-[#ab9482] font-mono">
                MemWal vector retrieval → Livepeer Agent MCP injection pipeline
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#ab9482] hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
          {/* Step 1: User's raw request */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono font-semibold text-[#ab9482] uppercase tracking-wider flex items-center gap-1.5">
                <Send className="w-3 h-3 text-[#c88d51]" />
                Stage 1 · Original User Creative Brief
              </span>
              <span className="text-[10px] font-mono text-[#786152]">Zero-reprompt</span>
            </div>
            <div className="p-3 bg-[#18120e] border border-[#38281e] rounded-xl text-xs text-[#f5f2eb] font-medium">
              &ldquo;{rawBrief || 'No prompt specified.'}&rdquo;
            </div>
          </div>

          {/* Step 2: Retrieved memories */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono font-semibold text-[#ab9482] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-[#dda15e]" />
                Stage 2 · Persistent Memories Retrieved from Walrus ({appliedMemories.length})
              </span>
              <span className="text-[10px] font-mono text-[#dda15e]">MemWal Match</span>
            </div>
            {appliedMemories.length === 0 ? (
              <div className="p-3 bg-[#18120e] border border-[#38281e] rounded-xl text-xs text-[#ab9482] italic">
                No existing memories found for this generation.
              </div>
            ) : (
              <div className="space-y-2">
                {appliedMemories.map((mem) => (
                  <div
                    key={mem.id}
                    className="p-2.5 bg-[#18120e] border border-[#38281e] rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-[#241a14] text-[#dda15e] font-mono text-[10px] uppercase border border-[#9c4e1f]/40">
                        {mem.category}
                      </span>
                      <span className="text-[#f5f2eb] font-medium">{mem.preference}</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#c88d51]">{mem.memwalBlobId}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Step 3: Final Enriched Brief sent to Livepeer */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono font-semibold text-[#ab9482] uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="w-3 h-3 text-[#dda15e]" />
                Stage 3 · Final Augmented Context Dispatched to Livepeer Agent
              </span>
              <span className="text-[10px] font-mono text-[#dda15e]">Livepeer MCP Tool</span>
            </div>
            <pre className="p-3.5 bg-black border border-[#38281e] rounded-xl text-xs text-[#dda15e] font-mono whitespace-pre-wrap leading-relaxed">
              {enrichedBrief}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-[#0d0a08] border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-[#fbf7ee] text-[#140e0b] hover:bg-[#ede4d1] font-semibold text-xs transition shadow-md shadow-[#9c4e1f]/10"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

