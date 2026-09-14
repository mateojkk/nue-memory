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
      <div className="w-full max-w-2xl bg-white border border-[var(--surface-2)] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--surface-2)] flex items-center justify-between bg-[var(--surface)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--surface)] border border-[var(--surface-2)] flex items-center justify-center text-[var(--accent-deep)]">
              <Sparkles className="w-4 h-4 text-[var(--accent-deep)]" />
            </div>
            <div>
              <h3 className="text-xs font-medium text-[var(--surface)]">
                Context Orchestration Inspector
              </h3>
              <p className="text-[10px] text-[var(--fg-muted)] font-mono">
                MemWal vector retrieval → Livepeer Agent MCP injection pipeline
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[var(--fg-muted)] hover:text-[var(--surface)] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh] bg-white">
          {/* Step 1: User's raw request */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono font-medium text-[var(--fg-muted)] uppercase tracking-wider flex items-center gap-1.5">
                <Send className="w-3 h-3 text-[var(--accent-deep)]" />
                Stage 1 · Original User Creative Brief
              </span>
              <span className="text-[10px] font-mono text-[var(--fg-muted)]">Zero-reprompt</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--surface-2)] text-xs font-mono text-[var(--surface)]">
              &quot;{rawBrief}&quot;
            </div>
          </div>

          {/* Step 2: Retrieved preferences */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono font-medium text-[var(--fg-muted)] uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-[var(--accent-deep)]" />
                Stage 2 · Retrieved Walrus Memories ({appliedMemories.length})
              </span>
              <span className="text-[10px] font-mono text-[var(--accent-deep)] font-medium bg-[var(--surface)] px-2 py-0.5 rounded border border-[var(--surface-2)]">
                MemWal Match
              </span>
            </div>
            <div className="space-y-1.5">
              {appliedMemories.length === 0 ? (
                <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--surface-2)] text-xs text-[var(--fg-muted)] font-mono italic">
                  No previous preferences matched.
                </div>
              ) : (
                appliedMemories.map((pref) => (
                  <div
                    key={pref.id}
                    className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--accent)]/25 flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[9px] uppercase font-medium bg-[var(--surface)] text-[var(--accent-deep)]">
                        {pref.category}
                      </span>
                      <span className="text-[var(--surface)] font-medium">{pref.preference}</span>
                    </div>
                    <span className="text-[10px] text-[var(--fg-muted)] shrink-0 ml-2">
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
              <span className="text-[10px] font-mono font-medium text-[var(--fg-muted)] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-[var(--accent-deep)]" />
                Stage 3 · Final Augmented Livepeer Agent Directives
              </span>
              <span className="text-[10px] font-mono text-emerald-600 font-medium">Live Remote MCP</span>
            </div>
            <pre className="p-3.5 rounded-xl bg-[var(--border)] border border-[var(--border)] text-[var(--surface)] text-xs font-mono whitespace-pre-wrap leading-relaxed">
              {enrichedBrief}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--surface-2)] bg-[var(--surface)] flex items-center justify-between text-xs font-mono text-[var(--fg-muted)]">
          <span>Autonomous Prompt Orchestrator</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-md bg-[var(--surface-2)] text-[var(--fg)] hover:bg-[var(--border)] font-medium text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
