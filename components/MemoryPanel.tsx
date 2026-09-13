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
      <div className="relative w-full max-w-md bg-[#faf8f5] h-full shadow-2xl flex flex-col z-10 border-l border-[#e7e2da] animate-slideLeft">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-[#e7e2da] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#f5ece4] border border-[#e2d5c5] flex items-center justify-center text-[#9c4e1f]">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-[#18120e]">Walrus Memory Vault</h3>
              <p className="text-[10px] font-mono text-[#786152]">
                Sui Walrus decentralized creative preference store
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-stone-400 hover:text-[#18120e] hover:bg-[#faf6f0] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Active Memories */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-medium uppercase tracking-wider text-[#18120e] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#9c4e1f]" />
                Active Preferences ({activeMemories.length})
              </span>
              <span className="text-[10px] font-mono text-[#9c4e1f] font-medium bg-[#f5ece4] px-2 py-0.5 rounded border border-[#e2d5c5]">
                Auto-Injected in Prompts
              </span>
            </div>

            {activeMemories.length === 0 ? (
              <div className="text-center py-10 px-4 rounded-2xl bg-white border border-[#e7e2da] text-stone-400 text-xs">
                <p className="mb-1">No active preferences found on Walrus.</p>
                <p className="text-[10px] text-stone-400">
                  Direct the agent in Studio and confirm memories to persist them here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeMemories.map((pref) => (
                  <div
                    key={pref.id}
                    className="p-4 rounded-2xl bg-white border border-[#e7e2da] hover:border-[#c88d51]/40 transition shadow-2xs group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-mono font-medium uppercase px-2 py-0.5 rounded bg-[#f5ece4] text-[#78350f]">
                        {pref.category}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-mono text-stone-400 bg-[#faf6f0] px-2 py-0.5 rounded border border-[#e7e2da]">
                          {pref.memwalBlobId || 'walrus-blob'}
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      </div>
                    </div>

                    <p className="text-xs text-[#18120e] font-medium mb-3 leading-relaxed">
                      {pref.preference}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-[#e7e2da] text-[10px] font-mono text-[#786152]">
                      <span>Strength: {pref.strength}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setInspectPref(pref)}
                          className="p-1 rounded text-[#786152] hover:text-[#18120e] hover:bg-[#faf6f0] transition"
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
                <span className="text-xs font-mono font-medium uppercase tracking-wider text-stone-500">
                  Superseded &amp; Evolved ({supersededMemories.length})
                </span>
                <span className="text-[10px] font-mono text-stone-400">Audit History</span>
              </div>

              <div className="space-y-2">
                {supersededMemories.map((pref) => (
                  <div
                    key={pref.id}
                    className="p-3 rounded-xl bg-white/70 border border-[#e7e2da] opacity-60 text-xs"
                  >
                    <div className="flex items-center justify-between mb-1 text-[10px] font-mono text-stone-400">
                      <span className="uppercase">{pref.category}</span>
                      <span>Superseded</span>
                    </div>
                    <p className="line-through text-stone-400 text-xs">{pref.preference}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-[#e7e2da] flex items-center justify-between text-xs font-mono text-[#786152]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>MemWal Active on Sui Walrus</span>
          </div>
          <span className="text-[10px] text-stone-400">Nue Decentralized Vault</span>
        </div>
      </div>

      {/* Raw Payload Modal */}
      {inspectPref && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#140e0b] border border-[#2e2016] rounded-2xl max-w-lg w-full p-6 text-white font-mono shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#2e2016]">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-[#dda15e]" />
                <span className="text-xs font-medium">Walrus Raw Blob Inspection</span>
              </div>
              <button
                onClick={() => setInspectPref(null)}
                className="p-1 rounded text-stone-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-black border border-[#2e2016] text-[#cbbba8] text-xs overflow-x-auto max-h-80 leading-relaxed">
              {JSON.stringify(inspectPref, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
