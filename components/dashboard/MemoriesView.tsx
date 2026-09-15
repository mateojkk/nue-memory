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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border)]">
        <div>
          <div className="text-xs font-mono text-[var(--accent)] uppercase tracking-wider mb-1">
            Memory Transparency Ledger
          </div>
          <h2 className="text-2xl sm:text-3xl font-medium text-[var(--fg)] tracking-tight font-sans">
            Structured Agent Memories
          </h2>
          <p className="text-[var(--fg-muted)] text-xs sm:text-sm mt-1">
            Inspect what Nue remembered, why it was extracted, source attributions, and audit supersessions.
          </p>
        </div>

        {/* Walrus Connection Indicator */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[var(--surface)] border border-[var(--border)] text-xs font-mono self-start">
          <span className={walrusIndicator.dotClass} title={health.walrus.message} />
          <span className="text-[var(--fg-faint)] uppercase tracking-wider">Walrus Relayer</span>
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
        <div className="flex items-center gap-1.5 p-1 bg-[var(--surface)] rounded-md border border-[var(--border)] text-xs font-mono">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1 rounded-sm transition ${
              activeTab === 'all' ? 'bg-[var(--border)] text-[var(--fg)] font-medium' : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
            }`}
          >
            All ({memories.length})
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`px-3 py-1 rounded-sm transition ${
              activeTab === 'active' ? 'bg-[var(--border)] text-emerald-400 font-medium' : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
            }`}
          >
            Active ({activeMemories.length})
          </button>
          <button
            onClick={() => setActiveTab('superseded')}
            className={`px-3 py-1 rounded-sm transition ${
              activeTab === 'superseded' ? 'bg-[var(--border)] text-amber-400 font-medium' : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
            }`}
          >
            Superseded ({supersededMemories.length})
          </button>
        </div>
      </div>

      {/* Memory Cards Grid */}
      {displayedMemories.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-3">
          <Database className="w-8 h-8 text-[var(--accent)] mx-auto opacity-40" />
          <h3 className="text-base font-medium text-[var(--fg-soft)] font-sans">No memories stored yet</h3>
          <p className="text-xs text-[var(--fg-faint)] max-w-md mx-auto">
            Interact with the Livepeer Agent in Media Memory or call the Nue SDK to store persistent context.
          </p>
          {onOpenStudio && (
            <button
              onClick={onOpenStudio}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[var(--accent-deep)] text-[#4a2c0e] text-xs font-medium hover:bg-[var(--surface-2)] transition mt-2"
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
                  ? 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--accent)]/50'
                  : 'bg-[var(--surface-2)] border-[var(--surface-2)] opacity-70 hover:opacity-100'
              }`}
            >
              <div className="space-y-3">
                {/* Header Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-medium uppercase px-2 py-0.5 rounded bg-[var(--border)] text-[var(--accent)] border border-[var(--border)]">
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
                  mem.isActive ? 'text-[var(--fg)]' : 'text-[var(--fg-muted)] line-through'
                }`}>
                  {mem.preference}
                </p>
              </div>

              {/* Footer Meta */}
              <div className="pt-4 mt-4 border-t border-[var(--surface-2)] text-[10px] font-mono text-[var(--fg-faint)] flex items-center justify-between">
                <span>Confidence: {mem.strength === 'high' ? '96%' : '88%'}</span>
                <span className="text-[var(--fg-muted)] group-hover:text-[var(--accent)] transition flex items-center gap-1">
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
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl max-w-lg w-full p-6 text-[var(--fg)] relative font-light">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] mb-5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="text-sm font-medium text-[var(--fg)] font-sans">
                  Memory Transparency Inspector
                </h3>
              </div>
              <button
                onClick={() => setSelectedMemory(null)}
                className="p-1 rounded text-[var(--fg-muted)] hover:text-[var(--fg)] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Memory Detail Rows */}
            <div className="space-y-4 font-mono text-xs">
              <div className="p-3 rounded bg-[var(--surface-2)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--fg-faint)] uppercase block mb-1">
                  Stored Preference Value
                </span>
                <div className="text-[var(--fg)] font-medium text-sm">
                  &ldquo;{selectedMemory.preference}&rdquo;
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="p-2.5 rounded bg-[var(--surface-2)] border border-[var(--border)]">
                  <span className="text-[var(--fg-faint)] block">Category</span>
                  <span className="text-[var(--accent)] uppercase font-medium">{selectedMemory.category}</span>
                </div>
                <div className="p-2.5 rounded bg-[var(--surface-2)] border border-[var(--border)]">
                  <span className="text-[var(--fg-faint)] block">Status</span>
                  <span className={selectedMemory.isActive ? 'text-emerald-400' : 'text-red-400'}>
                    {selectedMemory.isActive ? 'Active (Auto-injected)' : 'Superseded'}
                  </span>
                </div>
                <div className="p-2.5 rounded bg-[var(--surface-2)] border border-[var(--border)]">
                  <span className="text-[var(--fg-faint)] block">Confidence / Strength</span>
                  <span className="text-[var(--fg-soft)]">{selectedMemory.strength.toUpperCase()}</span>
                </div>
                <div className="p-2.5 rounded bg-[var(--surface-2)] border border-[var(--border)]">
                  <span className="text-[var(--fg-faint)] block">Persistence Backend</span>
                  <span className="text-[var(--fg-soft)]">Sui Walrus (MemWal)</span>
                </div>
                <div className="p-2.5 rounded bg-[var(--surface-2)] border border-[var(--border)] col-span-2">
                  <span className="text-[var(--fg-faint)] block">Walrus Storage Blob ID</span>
                  {selectedMemory.memwalBlobId ? (
                    <span className="text-[var(--accent)] font-mono text-[10px] break-all select-all">
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
              <div className="p-3 rounded bg-[var(--surface-2)] border border-[var(--border)] space-y-1 text-[11px]">
                <div className="text-[var(--fg-faint)] uppercase text-[10px]">Source Attribution</div>
                <div className="text-[var(--fg-soft)]">
                  Origin: User feedback review on {selectedMemory.projectTitle || 'Project A - SaaS App Launch Promo'}
                </div>
                <div className="text-[var(--fg-faint)] text-[10px]">
                  Created: {new Date(selectedMemory.createdAt).toLocaleString()}
                </div>
              </div>

              {selectedMemory.supersedesId && (
                <div className="p-3 rounded bg-[var(--border)] border border-amber-900/40 text-[11px] text-amber-300">
                  Evolution: This memory superseded older contradictory record ID: <span className="font-mono">{selectedMemory.supersedesId}</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-5 mt-5 border-t border-[var(--border)]">
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
                className="px-4 py-1.5 rounded bg-[var(--border)] hover:bg-[var(--border)] text-[var(--fg-soft)] text-xs font-mono border border-[var(--border)] transition"
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
