'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Database, Clock, Eye, Trash2, X, Check, ShieldCheck, ArrowRight } from 'lucide-react';
import { MediaPreference, StructuredMemory } from '@/lib/types';
import { useSystemHealth, connectionIndicator } from '@/lib/hooks/useSystemHealth';

interface MemoriesViewProps {
  memories: MediaPreference[];
  isLoading?: boolean;
  onForget: (id: string) => void;
  onOpenStudio?: () => void;
  userNamespace?: string;
  userEmail?: string;
}

const VALID_FILTERS: Array<'all' | 'active' | 'superseded'> = ['all', 'active', 'superseded'];

function getResolvedFilter(): 'all' | 'active' | 'superseded' {
  if (typeof window !== 'undefined') {
    try {
      const urlFilter = new URLSearchParams(window.location.search).get('filter') as 'all' | 'active' | 'superseded' | null;
      if (urlFilter && VALID_FILTERS.includes(urlFilter)) {
        return urlFilter;
      }
      const savedFilter = localStorage.getItem('nue_memories_filter') as 'all' | 'active' | 'superseded' | null;
      if (savedFilter && VALID_FILTERS.includes(savedFilter)) {
        return savedFilter;
      }
    } catch {
      // Ignore storage errors
    }
  }
  return 'all';
}

export function MemoriesView({
  memories,
  isLoading = false,
  onForget,
  onOpenStudio,
  userNamespace,
  userEmail,
}: MemoriesViewProps) {
  const [selectedMemory, setSelectedMemory] = useState<MediaPreference | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'superseded'>(getResolvedFilter);
  const { health, isLoading: isHealthLoading } = useSystemHealth();
  const walrusIndicator = connectionIndicator(health.walrus.state, isHealthLoading);

  const handleFilterChange = (filter: 'all' | 'active' | 'superseded') => {
    setActiveTab(filter);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('nue_memories_filter', filter);
        const url = new URL(window.location.href);
        if (url.searchParams.get('filter') !== filter) {
          url.searchParams.set('filter', filter);
          window.history.replaceState(null, '', url.toString());
        }
      } catch {
        // Ignore
      }
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const resolved = getResolvedFilter();
    if (resolved !== activeTab) {
      setActiveTab(resolved);
    }
  }, []);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-2xl sm:text-3xl font-medium text-[var(--fg)] tracking-tight font-sans">
              Agent Memories
            </h2>
          </div>
          <p className="text-[var(--fg-muted)] text-xs sm:text-sm mt-1">
            Review and manage the creative preferences your agent has learned from your feedback.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[var(--surface-2)] rounded-lg text-xs font-medium">
          <button
            onClick={() => handleFilterChange('all')}
            className={`px-3 py-1.5 rounded-md transition ${
              activeTab === 'all' ? 'bg-[var(--surface)] text-[var(--fg)] font-medium shadow-xs' : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
            }`}
          >
            All ({memories.length})
          </button>
          <button
            onClick={() => handleFilterChange('active')}
            className={`px-3 py-1.5 rounded-md transition ${
              activeTab === 'active' ? 'bg-[var(--surface)] text-emerald-500 font-medium shadow-xs' : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
            }`}
          >
            Active ({activeMemories.length})
          </button>
          <button
            onClick={() => handleFilterChange('superseded')}
            className={`px-3 py-1.5 rounded-md transition ${
              activeTab === 'superseded' ? 'bg-[var(--surface)] text-amber-500 font-medium shadow-xs' : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
            }`}
          >
            Replaced ({supersededMemories.length})
          </button>
        </div>
      </div>

      {/* Memory Cards Grid */}
      {isLoading && displayedMemories.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" aria-live="polite" aria-busy="true">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-5 rounded-xl bg-[var(--surface)] shadow-lg space-y-3 animate-pulse">
              <div className="h-4 w-24 rounded bg-[var(--surface-2)]" />
              <div className="h-3 w-full rounded bg-[var(--surface-2)]" />
              <div className="h-3 w-2/3 rounded bg-[var(--surface-2)]" />
              <div className="pt-4 mt-4 flex items-center justify-between">
                <div className="h-3 w-20 rounded bg-[var(--surface-2)]" />
                <div className="h-3 w-12 rounded bg-[var(--surface-2)]" />
              </div>
            </div>
          ))}
        </div>
      ) : displayedMemories.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-xl bg-[var(--surface)] space-y-3">
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
              className={`p-5 rounded-xl transition cursor-pointer flex flex-col justify-between group shadow-lg ${
                mem.isActive
                  ? 'bg-[var(--surface)]'
                  : 'bg-[var(--surface-2)] opacity-70 hover:opacity-100'
              }`}
            >
              <div className="space-y-3">
                {/* Header Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-medium uppercase px-2 py-0.5 rounded bg-[var(--surface-2)] text-[var(--accent)]">
                    {mem.category}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {mem.isActive ? (
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-emerald-950/60 text-emerald-400">
                        ACTIVE
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-red-950/60 text-red-400">
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
              <div className="pt-4 mt-4 text-[10px] font-mono text-[var(--fg-faint)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>Confidence: {mem.strength === 'high' ? '96%' : '88%'}</span>
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
          <div className="bg-[var(--surface)] rounded-2xl max-w-lg w-full p-6 text-[var(--fg)] relative font-light shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 mb-5">
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
              <div className="p-3.5 rounded-xl bg-[var(--surface-2)]">
                <span className="text-[10px] text-[var(--fg-faint)] uppercase font-mono block mb-1">
                  Creative Rule
                </span>
                <div className="text-[var(--fg)] font-medium text-sm leading-relaxed">
                  &ldquo;{selectedMemory.preference}&rdquo;
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[var(--surface-2)]">
                  <span className="text-[10px] text-[var(--fg-faint)] uppercase font-mono block mb-1">Category</span>
                  <span className="text-[var(--accent)] font-medium uppercase text-xs">{selectedMemory.category}</span>
                </div>
                <div className="p-3 rounded-xl bg-[var(--surface-2)]">
                  <span className="text-[10px] text-[var(--fg-faint)] uppercase font-mono block mb-1">Status</span>
                  <span className={selectedMemory.isActive ? 'text-emerald-500 font-medium' : 'text-amber-500 font-medium'}>
                    {selectedMemory.isActive ? 'Active (Auto-applied)' : 'Replaced by newer preference'}
                  </span>
                </div>
              </div>

              {/* Attribution */}
              <div className="p-3 rounded-xl bg-[var(--surface-2)] space-y-1 text-xs">
                <div className="text-[10px] text-[var(--fg-faint)] uppercase font-mono">Learned From</div>
                <div className="text-[var(--fg-soft)]">
                  Feedback on <span className="text-[var(--fg)] font-medium">{selectedMemory.projectTitle || 'Creative Studio'}</span>
                </div>
                <div className="text-[10px] text-[var(--fg-faint)]">
                  Saved on {new Date(selectedMemory.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>

              {selectedMemory.supersedesId && (
                <div className="p-3 rounded-xl bg-amber-500/10 text-xs text-amber-500">
                  Updated an earlier conflicting preference to match your latest guidance.
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-5 mt-5">
              <button
                onClick={() => {
                  onForget(selectedMemory.id);
                  setSelectedMemory(null);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-950/40 hover:bg-red-900/60 text-red-400 text-xs font-mono transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Memory</span>
              </button>

              <button
                onClick={() => setSelectedMemory(null)}
                className="px-4 py-1.5 rounded bg-[var(--surface-2)] hover:bg-[var(--surface-2)]/80 text-[var(--fg-soft)] text-xs font-mono transition"
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
