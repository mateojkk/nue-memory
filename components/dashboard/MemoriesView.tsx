'use client';

import React, { useState } from 'react';
import { Sparkles, Database, Clock, Eye, Trash2, X, Check, ShieldCheck, ArrowRight } from 'lucide-react';
import { MediaPreference, StructuredMemory } from '@/lib/types';
import { useSystemHealth, connectionIndicator } from '@/lib/hooks/useSystemHealth';

interface MemoriesViewProps {
  memories: MediaPreference[];
  onForget: (id: string) => void;
  onOpenStudio?: () => void;
}

export function MemoriesView({ memories, onForget, onOpenStudio }: MemoriesViewProps) {
  const [selectedMemory, setSelectedMemory] = useState<MediaPreference | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'superseded'>('all');
  const { health, isLoading } = useSystemHealth();
  const walrusIndicator = connectionIndicator(health.walrus.state, isLoading);

  const activeMemories = memories.filter((m) => m.isActive);
  const supersededMemories = memories.filter((m) => !m.isActive);

  const displayedMemories =
    activeTab === 'active'
      ? activeMemories
      : activeTab === 'superseded'
      ? supersededMemories
      : memories;

  return (
    <div className="space-y-8 font-light text-left">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#241f1a]">
        <div>
          <div className="text-xs font-mono text-[#c88d51] uppercase tracking-wider mb-1">
            Memory Transparency Ledger
          </div>
          <h2 className="text-2xl sm:text-3xl font-medium text-white tracking-tight font-sans">
            Structured Agent Memories
          </h2>
          <p className="text-stone-400 text-xs sm:text-sm mt-1">
            Inspect what Nue remembered, why it was extracted, source attributions, and audit supersessions.
          </p>
        </div>

        {/* Walrus Connection Indicator */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#141210] border border-[#26211d] text-xs font-mono self-start">
          <span className={walrusIndicator.dotClass} title={health.walrus.message} />
          <span className="text-stone-500 uppercase tracking-wider">Walrus Relayer</span>
          <span
            className={
              health.walrus.state === 'connected'
                ? 'text-emerald-400 font-medium'
                : health.walrus.state === 'missing_keys' || health.walrus.state === 'error'
                ? 'text-red-400 font-medium'
                : 'text-amber-400 font-medium'
            }
          >
            {walrusIndicator.label}
          </span>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[#141210] rounded-md border border-[#26211d] text-xs font-mono">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1 rounded-sm transition ${
              activeTab === 'all' ? 'bg-[#241e1a] text-white font-medium' : 'text-stone-400 hover:text-white'
            }`}
          >
            All ({memories.length})
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`px-3 py-1 rounded-sm transition ${
              activeTab === 'active' ? 'bg-[#241e1a] text-emerald-400 font-medium' : 'text-stone-400 hover:text-white'
            }`}
          >
            Active ({activeMemories.length})
          </button>
          <button
            onClick={() => setActiveTab('superseded')}
            className={`px-3 py-1 rounded-sm transition ${
              activeTab === 'superseded' ? 'bg-[#241e1a] text-amber-400 font-medium' : 'text-stone-400 hover:text-white'
            }`}
          >
            Superseded ({supersededMemories.length})
          </button>
        </div>
      </div>

      {/* Memory Cards Grid */}
      {displayedMemories.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-xl bg-[#12100e] border border-[#241f1a] space-y-3">
          <Database className="w-8 h-8 text-[#c88d51] mx-auto opacity-40" />
          <h3 className="text-base font-medium text-stone-300 font-sans">No memories stored yet</h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            Interact with the Livepeer Agent in Media Memory or call the Nue SDK to store persistent context.
          </p>
          {onOpenStudio && (
            <button
              onClick={onOpenStudio}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#ededed] text-[#0c0a09] text-xs font-medium hover:bg-white transition mt-2"
            >
              <span>Launch Media Memory Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedMemories.map((mem) => (
            <div
              key={mem.id}
              onClick={() => setSelectedMemory(mem)}
              className={`p-5 rounded-xl border transition cursor-pointer flex flex-col justify-between group shadow-lg ${
                mem.isActive
                  ? 'bg-[#141210] border-[#26211d] hover:border-[#c88d51]/50'
                  : 'bg-[#100e0c] border-[#1f1a16] opacity-70 hover:opacity-100'
              }`}
            >
              <div className="space-y-3">
                {/* Header Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-medium uppercase px-2 py-0.5 rounded bg-[#1e1814] text-[#c88d51] border border-[#33271f]">
                    {mem.category}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {mem.isActive ? (
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-900/50">
                        ACTIVE
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-red-950/60 text-red-400 border border-red-900/50">
                        SUPERSEDED
                      </span>
                    )}
                  </div>
                </div>

                {/* Preference Content */}
                <p className={`text-xs sm:text-sm font-medium leading-relaxed font-sans ${
                  mem.isActive ? 'text-stone-100' : 'text-stone-400 line-through'
                }`}>
                  {mem.preference}
                </p>
              </div>

              {/* Footer Meta */}
              <div className="pt-4 mt-4 border-t border-[#1f1b17] text-[10px] font-mono text-stone-500 flex items-center justify-between">
                <span>Confidence: {mem.strength === 'high' ? '96%' : '88%'}</span>
                <span className="text-stone-400 group-hover:text-[#c88d51] transition flex items-center gap-1">
                  <span>Inspect</span>
                  <Eye className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Slide-over Inspection Modal (Section 21/22: Memory Transparency) */}
      {selectedMemory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#12100e] border border-[#2a241f] rounded-xl max-w-lg w-full p-6 text-stone-200 shadow-2xl relative font-light">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#241f1a] mb-5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#c88d51]" />
                <h3 className="text-sm font-medium text-white font-sans">
                  Memory Transparency Inspector
                </h3>
              </div>
              <button
                onClick={() => setSelectedMemory(null)}
                className="p-1 rounded text-stone-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Memory Detail Rows */}
            <div className="space-y-4 font-mono text-xs">
              <div className="p-3 rounded bg-[#171411] border border-[#29231f]">
                <span className="text-[10px] text-stone-500 uppercase block mb-1">
                  Stored Preference Value
                </span>
                <div className="text-white font-medium text-sm">
                  &ldquo;{selectedMemory.preference}&rdquo;
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="p-2.5 rounded bg-[#171411] border border-[#241f1a]">
                  <span className="text-stone-500 block">Category</span>
                  <span className="text-[#c88d51] uppercase font-medium">{selectedMemory.category}</span>
                </div>
                <div className="p-2.5 rounded bg-[#171411] border border-[#241f1a]">
                  <span className="text-stone-500 block">Status</span>
                  <span className={selectedMemory.isActive ? 'text-emerald-400' : 'text-red-400'}>
                    {selectedMemory.isActive ? 'Active (Auto-injected)' : 'Superseded'}
                  </span>
                </div>
                <div className="p-2.5 rounded bg-[#171411] border border-[#241f1a]">
                  <span className="text-stone-500 block">Confidence / Strength</span>
                  <span className="text-stone-300">{selectedMemory.strength.toUpperCase()}</span>
                </div>
                <div className="p-2.5 rounded bg-[#171411] border border-[#241f1a]">
                  <span className="text-stone-500 block">Persistence Backend</span>
                  <span className="text-stone-300">Sui Walrus (MemWal)</span>
                </div>
                <div className="p-2.5 rounded bg-[#171411] border border-[#241f1a] col-span-2">
                  <span className="text-stone-500 block">Walrus Storage Blob ID</span>
                  {selectedMemory.memwalBlobId ? (
                    <span className="text-[#c88d51] font-mono text-[10px] break-all select-all">
                      {selectedMemory.memwalBlobId}
                    </span>
                  ) : (
                    <span className="text-amber-400 font-mono text-[10px]">
                      Not yet persisted to Walrus — remember this memory to obtain a blob ID
                    </span>
                  )}
                </div>
              </div>

              {/* Attribution (Section 22) */}
              <div className="p-3 rounded bg-[#171411] border border-[#241f1a] space-y-1 text-[11px]">
                <div className="text-stone-500 uppercase text-[10px]">Source Attribution</div>
                <div className="text-stone-300">
                  Origin: User feedback review on {selectedMemory.projectTitle || 'Project A - SaaS App Launch Promo'}
                </div>
                <div className="text-stone-500 text-[10px]">
                  Created: {new Date(selectedMemory.createdAt).toLocaleString()}
                </div>
              </div>

              {selectedMemory.supersedesId && (
                <div className="p-3 rounded bg-[#201815] border border-amber-900/40 text-[11px] text-amber-300">
                  Evolution: This memory superseded older contradictory record ID: <span className="font-mono">{selectedMemory.supersedesId}</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-5 mt-5 border-t border-[#241f1a]">
              <button
                onClick={() => {
                  onForget(selectedMemory.id);
                  setSelectedMemory(null);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-950/40 hover:bg-red-900/60 text-red-400 text-xs font-mono border border-red-900/50 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Memory</span>
              </button>

              <button
                onClick={() => setSelectedMemory(null)}
                className="px-4 py-1.5 rounded bg-[#211b17] hover:bg-[#2b241e] text-stone-300 text-xs font-mono border border-[#332b24] transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
