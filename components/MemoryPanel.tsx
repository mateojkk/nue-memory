'use client';

import React, { useState } from 'react';
import { X, Database, Trash2, Eye, ShieldCheck, Sparkles, Code2 } from 'lucide-react';
import { MediaPreference } from '@/lib/types';

interface MemoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  memories: MediaPreference[];
  onForget: (id: string) => void;
}

export const MemoryPanel: React.FC<MemoryPanelProps> = ({
  isOpen,
  onClose,
  memories,
  onForget,
}) => {
  const [inspectPref, setInspectPref] = useState<MediaPreference | null>(null);

  if (!isOpen) return null;

  const activeMemories = memories.filter((m) => m.isActive);
  const supersededMemories = memories.filter((m) => !m.isActive);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-[var(--surface)] h-full shadow-2xl flex flex-col z-10 border-l border-[var(--surface-2)] animate-slideLeft">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-[var(--surface-2)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--surface)] border border-[var(--surface-2)] flex items-center justify-center text-[var(--accent-deep)]">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-[var(--surface)]">Walrus Memory Vault</h3>
              <p className="text-[10px] font-mono text-[var(--fg-muted)]">
                Sui Walrus decentralized creative preference store
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-[var(--fg-muted)] hover:text-[var(--surface)] hover:bg-[var(--surface)] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Active Memories */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-medium uppercase tracking-wider text-[var(--surface)] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[var(--accent-deep)]" />
                Active Preferences ({activeMemories.length})
              </span>
              <span className="text-[10px] font-mono text-[var(--accent-deep)] font-medium bg-[var(--surface)] px-2 py-0.5 rounded border border-[var(--surface-2)]">
                Auto-Injected in Prompts
              </span>
            </div>

            {activeMemories.length === 0 ? (
              <div className="text-center py-10 px-4 rounded-2xl bg-white border border-[var(--surface-2)] text-[var(--fg-muted)] text-xs">
                <p className="mb-1">No active preferences found on Walrus.</p>
                <p className="text-[10px] text-[var(--fg-muted)]">
                  Direct the agent in Studio and confirm memories to persist them here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeMemories.map((pref) => (
                  <div
                    key={pref.id}
                    className="p-4 rounded-2xl bg-white border border-[var(--surface-2)] hover:border-[var(--accent)]/40 transition shadow-2xs group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-mono font-medium uppercase px-2 py-0.5 rounded bg-[var(--surface)] text-[var(--accent-deep)]">
                        {pref.category}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-mono text-[var(--fg-muted)] bg-[var(--surface)] px-2 py-0.5 rounded border border-[var(--surface-2)]">
                          {pref.memwalBlobId || 'walrus-blob'}
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      </div>
                    </div>

                    <p className="text-xs text-[var(--surface)] font-medium mb-3 leading-relaxed">
                      {pref.preference}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-[var(--surface-2)] text-[10px] font-mono text-[var(--fg-muted)]">
                      <span>Strength: {pref.strength}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setInspectPref(pref)}
                          className="p-1 rounded text-[var(--fg-muted)] hover:text-[var(--surface)] hover:bg-[var(--surface)] transition"
                          title="Inspect raw payload"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onForget(pref.id)}
                          className="p-1 rounded text-red-500 hover:text-red-600 hover:bg-red-50 transition"
                          title="Delete from memory"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Superseded Memories */}
          {supersededMemories.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-medium uppercase tracking-wider text-[var(--fg-faint)]">
                  Superseded &amp; Evolved ({supersededMemories.length})
                </span>
                <span className="text-[10px] font-mono text-[var(--fg-muted)]">Audit History</span>
              </div>

              <div className="space-y-2">
                {supersededMemories.map((pref) => (
                  <div
                    key={pref.id}
                    className="p-3 rounded-xl bg-white/70 border border-[var(--surface-2)] opacity-60 text-xs"
                  >
                    <div className="flex items-center justify-between mb-1 text-[10px] font-mono text-[var(--fg-muted)]">
                      <span className="uppercase">{pref.category}</span>
                      <span>Superseded</span>
                    </div>
                    <p className="line-through text-[var(--fg-muted)] text-xs">{pref.preference}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-[var(--surface-2)] flex items-center justify-between text-xs font-mono text-[var(--fg-muted)]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>MemWal Active on Sui Walrus</span>
          </div>
          <span className="text-[10px] text-[var(--fg-muted)]">Nue Decentralized Vault</span>
        </div>
      </div>

      {/* Raw Payload Modal */}
      {inspectPref && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[var(--border)] border border-[var(--border)] rounded-2xl max-w-lg w-full p-6 text-[var(--fg)] font-mono shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-[var(--accent-bright)]" />
                <span className="text-xs font-medium">Walrus Raw Blob Inspection</span>
              </div>
              <button
                onClick={() => setInspectPref(null)}
                className="p-1 rounded text-[var(--fg-muted)] hover:text-[var(--fg)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-black border border-[var(--border)] text-[var(--accent-bright)] text-xs overflow-x-auto max-h-80 leading-relaxed">
              {JSON.stringify(inspectPref, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
