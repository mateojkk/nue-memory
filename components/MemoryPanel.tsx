'use client';

import React, { useState } from 'react';
import { X, Sparkles, Database, Trash2, CheckCircle2, ShieldCheck, Code, ExternalLink } from 'lucide-react';
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
  const [inspectMemory, setInspectMemory] = useState<MediaPreference | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md h-full bg-[#0e0a08] border-l border-[#c88d51]/25 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-[#0d0a08]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#1e1510] border border-[#c88d51]/30 flex items-center justify-center text-[#dda15e]">
              <Database className="w-3.5 h-3.5 text-[#c88d51]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold text-white tracking-tight uppercase">
                  Media Memory Vault
                </h3>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#c88d51]/15 text-[#dda15e] border border-[#c88d51]/25">
                  MemWal Live
                </span>
              </div>
              <p className="text-[10px] text-[#ab9482] font-mono">Durable vector memory on Walrus</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#ab9482] hover:text-[#fbf7ee] hover:bg-white/5 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {memories.length === 0 ? (
            <div className="text-center py-20 px-4">
              <div className="w-12 h-12 rounded-2xl bg-[#18120e] border border-white/5 flex items-center justify-center mx-auto mb-3 text-[#ab9482]">
                <Database className="w-5 h-5 text-[#c88d51]" />
              </div>
              <h4 className="text-xs font-medium text-[#f5f2eb]">No Memories Persisted Yet</h4>
              <p className="text-[11px] text-[#ab9482] mt-1 max-w-xs mx-auto leading-relaxed">
                Generate media and provide creative feedback. Click &ldquo;Remember&rdquo; to store preferences into Walrus via MemWal.
              </p>
            </div>
          ) : (
            memories.map((mem) => (
              <div
                key={mem.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  mem.isActive
                    ? 'bg-[#18120e] border-[#38281e] hover:border-[#c88d51]/40'
                    : 'bg-[#100c09] border-white/5 opacity-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-[#241a14] text-[#dda15e] text-[10px] font-mono uppercase tracking-wider border border-[#9c4e1f]/40">
                      {mem.category}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-mono text-[#dda15e]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#dda15e]" />
                      Active
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setInspectMemory(mem)}
                      className="p-1 rounded text-[#ab9482] hover:text-[#dda15e] hover:bg-white/5 transition"
                      title="Inspect Raw Walrus Payload"
                    >
                      <Code className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onForget(mem.id)}
                      className="p-1 rounded text-[#ab9482] hover:text-red-400 hover:bg-white/5 transition"
                      title="Forget Memory"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-[#f5f2eb] font-medium leading-relaxed">
                  {mem.preference}
                </p>

                {/* Walrus Blob ID & Timestamp */}
                <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] text-[#ab9482] font-mono">
                  <div className="truncate max-w-[210px] flex items-center gap-1">
                    <span className="text-[#786152]">Blob:</span>
                    <span className="text-[#c88d51]">{mem.memwalBlobId || 'walrus-synced'}</span>
                  </div>
                  <span>
                    {new Date(mem.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>

                {mem.supersedesId && (
                  <div className="mt-2 text-[10px] font-mono text-[#dda15e] bg-[#2d1b11] px-2 py-0.5 rounded border border-[#9c4e1f]/50">
                    Evolved: supersedes conflicting previous preference
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="p-3.5 bg-[#0d0a08] border-t border-white/10 text-xs text-[#ab9482] flex items-center justify-between font-mono">
          <div className="flex items-center gap-1.5 text-[#dda15e]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#dda15e]" />
            <span>{memories.filter((m) => m.isActive).length} Memories Stored</span>
          </div>
          <span className="text-[10px] text-[#786152]">Mysten MemWal SDK v0.1.6</span>
        </div>
      </div>

      {/* Raw JSON Inspector Modal */}
      {inspectMemory && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-lg bg-[#0e0a08] border border-[#c88d51]/30 rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-[#c88d51]" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-white">
                  Walrus On-Chain Memory Payload
                </h4>
              </div>
              <button
                onClick={() => setInspectMemory(null)}
                className="text-[#ab9482] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <pre className="mt-3 p-3.5 bg-black rounded-xl text-[11px] font-mono text-[#dda15e] overflow-x-auto max-h-80 border border-[#38281e] leading-relaxed">
              {JSON.stringify(inspectMemory, null, 2)}
            </pre>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setInspectMemory(null)}
                className="px-3.5 py-1.5 rounded-lg bg-[#fbf7ee] text-[#140e0b] hover:bg-[#ede4d1] text-xs font-semibold transition shadow-md shadow-[#9c4e1f]/10"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

