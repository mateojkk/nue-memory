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
          <h2 className="text-2xl sm:text-3xl font-medium text-[var(--fg)] tracking-tight font-sans">
            Agent Memories
          </h2>
          <p className="text-[var(--fg-muted)] text-xs sm:text-sm mt-1">
            Review and manage the creative preferences your agent has learned from your feedback.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[var(--surface-2)] rounded-lg text-xs font-medium">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-md transition ${
              activeTab === 'all' ? 'bg-[var(--surface)] text-[var(--fg)] font-medium shadow-xs' : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
            }`}
          >
            All ({memories.length})
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`px-3 py-1.5 rounded-md transition ${
              activeTab === 'active' ? 'bg-[var(--surface)] text-emerald-500 font-medium shadow-xs' : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
            }`}
          >
            Active ({activeMemories.length})
          </button>
          <button
            onClick={() => setActiveTab('superseded')}
            className={`px-3 py-1.5 rounded-md transition ${
              activeTab === 'superseded' ? 'bg-[var(--surface)] text-amber-500 font-medium shadow-xs' : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
            }`}
          >
            Replaced ({supersededMemories.length})
          </button>
        </div>
      </div>

      {/* Memory Cards Grid */}
      {displayedMemories.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-3">
          <Database className="w-8 h-8 text-[var(--accent)] mx-auto opacity-40" />
          <h3 className="text-base font-medium text-[var(--fg-soft)] font-sans">No preferences learned yet</h3>
          <p className="text-xs text-[var(--fg-muted)] max-w-md mx-auto">
            Give feedback on generated videos in Creative Studio, and your agent will automatically learn and remember your creative taste.
          </p>
          {onOpenStudio && (
            <button
              onClick={onOpenStudio}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent-deep)] text-[#4a2c0e] text-xs font-medium hover:bg-[var(--accent)] transition mt-2 active:scale-95 shadow-sm"
            >
              <span>Go to Creative Studio</span>
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
                <div className="flex items-center gap-2">
                  <span>Confidence: {mem.strength === 'high' ? '96%' : '88%'}</span>
                  {mem.memwalBlobId && (
                    <span className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--accent)] font-mono text-[9px] border border-[var(--border)]" title={`Walrus Blob ID: ${mem.memwalBlobId}`}>
                      Walrus: {mem.memwalBlobId.slice(0, 6)}...
                    </span>
                  )}
                </div>
                <span className="text-[var(--fg-muted)] group-hover:text-[var(--accent)] transition flex items-center gap-1">
                  <span>Details</span>
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
                  Learned Preference Details
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
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--fg-faint)] uppercase font-mono block mb-1">
                  Creative Rule
                </span>
                <div className="text-[var(--fg)] font-medium text-sm leading-relaxed">
                  &ldquo;{selectedMemory.preference}&rdquo;
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                  <span className="text-[10px] text-[var(--fg-faint)] uppercase font-mono block mb-1">Category</span>
                  <span className="text-[var(--accent)] font-medium uppercase text-xs">{selectedMemory.category}</span>
                </div>
                <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                  <span className="text-[10px] text-[var(--fg-faint)] uppercase font-mono block mb-1">Status</span>
                  <span className={selectedMemory.isActive ? 'text-emerald-500 font-medium' : 'text-amber-500 font-medium'}>
                    {selectedMemory.isActive ? 'Active (Auto-applied)' : 'Replaced by newer preference'}
                  </span>
                </div>
              </div>

              {/* Walrus Decentralized Storage Verification */}
              {selectedMemory.memwalBlobId && (
                <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-900/40 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-cyan-400 uppercase font-mono flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-cyan-400" />
                      Sui Walrus Decentralized Proof
                    </span>
                    <a
                      href={`https://walruscan.com/testnet/blob/${selectedMemory.memwalBlobId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-mono"
                    >
                      Walruscan &rarr;
                    </a>
                  </div>
                  <div className="font-mono text-[10px] text-[var(--fg-muted)] truncate bg-black/40 px-2 py-1 rounded">
                    Blob ID: {selectedMemory.memwalBlobId}
                  </div>
                </div>
              )}

              {/* Attribution */}
              <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] space-y-1 text-xs">
                <div className="text-[10px] text-[var(--fg-faint)] uppercase font-mono">Learned From</div>
                <div className="text-[var(--fg-soft)]">
                  Feedback on <span className="text-[var(--fg)] font-medium">{selectedMemory.projectTitle || 'Creative Studio'}</span>
                </div>
                <div className="text-[10px] text-[var(--fg-faint)]">
                  Saved on {new Date(selectedMemory.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>

              {selectedMemory.supersedesId && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500">
                  Updated an earlier conflicting preference to match your latest guidance.
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
