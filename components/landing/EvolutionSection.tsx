'use client';

import React, { useState } from 'react';
import { ArrowDown, Check, Clock, RefreshCw, AlertCircle } from 'lucide-react';

export function EvolutionSection() {
  const [activeStage, setActiveStage] = useState<'initial' | 'updated'>('updated');

  return (
    <section className="py-24 px-4 max-w-7xl mx-auto border-t border-[#211b17] font-light">
      <div className="text-left mb-12">
        <div className="text-xs font-mono text-[#c88d51] uppercase tracking-wider mb-2">
          Dynamic Lifecycle
        </div>
        <h2 className="text-3xl sm:text-5xl font-medium text-white tracking-tight font-sans">
          Continuous Memory Evolution
        </h2>
        <p className="text-stone-400 text-sm sm:text-base mt-2 max-w-2xl font-light">
          Preferences change. Naive memory layers accumulate contradictions indefinitely. Nue resolves conflicting memories autonomously through supersession relationships.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Interactive Simulation Control */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-xl bg-[#12100e] border border-[#26211d] space-y-4">
            <span className="text-xs font-mono uppercase tracking-wider text-stone-400 font-medium block">
              Simulate Preference Shift
            </span>

            <div className="space-y-3">
              <button
                onClick={() => setActiveStage('initial')}
                className={`w-full text-left p-3.5 rounded-md border transition text-xs font-mono ${
                  activeStage === 'initial'
                    ? 'bg-[#1f1a16] border-[#c88d51]/50 text-white shadow-sm'
                    : 'bg-[#141210] border-[#241f1a] text-stone-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[#c88d51]">Session 01 (Initial)</span>
                  <Clock className="w-3.5 h-3.5 text-stone-500" />
                </div>
                <div>&ldquo;I prefer dark, high-contrast interfaces.&rdquo;</div>
              </button>

              <button
                onClick={() => setActiveStage('updated')}
                className={`w-full text-left p-3.5 rounded-md border transition text-xs font-mono ${
                  activeStage === 'updated'
                    ? 'bg-[#1f1a16] border-[#c88d51]/50 text-white shadow-sm'
                    : 'bg-[#141210] border-[#241f1a] text-stone-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[#c88d51]">Session 04 (Updated)</span>
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div>&ldquo;I&apos;ve changed my mind. Use light interfaces from now on.&rdquo;</div>
              </button>
            </div>

            <p className="text-xs text-stone-400 font-light leading-relaxed pt-3 border-t border-[#211b17]">
              Instead of returning both contradictory memories to the agent prompt, Nue creates a directed supersession pointer from Memory A to Memory B.
            </p>
          </div>
        </div>

        {/* Right Column: Internal Graph Representation */}
        <div className="lg:col-span-7 rounded-xl bg-[#12100e] border border-[#26211d] p-6 sm:p-8 shadow-2xl space-y-5 font-mono text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#241f1a]">
            <span className="text-stone-400 uppercase text-[11px] tracking-wider">
              Nue Memory Graph State
            </span>
            <span className="text-emerald-400 text-[11px] flex items-center gap-1">
              <Check className="w-3 h-3" />
              Effective Context: Zero Conflict
            </span>
          </div>

          {/* Memory A */}
          <div className={`p-4 rounded-lg border transition-all ${
            activeStage === 'updated'
              ? 'bg-[#14100e] border-red-900/30 opacity-60'
              : 'bg-[#1a1714] border-[#c88d51]/40'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-stone-400 font-medium">Memory 0x4A1F</span>
                <span className="text-[10px] text-stone-500 uppercase px-1.5 py-0.5 rounded bg-black/40">
                  Category: UI_THEME
                </span>
              </div>
              {activeStage === 'updated' ? (
                <span className="px-2 py-0.5 rounded text-[10px] bg-red-950/60 text-red-400 border border-red-900/50">
                  SUPERSEDED
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950/60 text-emerald-400 border border-emerald-900/50">
                  ACTIVE
                </span>
              )}
            </div>
            <div className={`${activeStage === 'updated' ? 'line-through text-stone-500' : 'text-stone-200'}`}>
              value: &quot;I prefer dark, high-contrast interfaces&quot;
            </div>
            <div className="mt-2 text-[10px] text-stone-500 flex items-center justify-between">
              <span>Source: Session 01 Feedback</span>
              <span>Strength: High</span>
            </div>
          </div>

          {/* Supersession Connector */}
          {activeStage === 'updated' && (
            <div className="flex flex-col items-center py-1">
              <div className="text-[10px] text-[#c88d51] flex items-center gap-1">
                <span>↓ superseded_by (Pointer: 0x9B8C)</span>
              </div>
            </div>
          )}

          {/* Memory B (Only shown or highlighted in updated stage) */}
          {activeStage === 'updated' && (
            <div className="p-4 rounded-lg bg-[#181512] border border-[#c88d51]/50 shadow-lg shadow-[#c88d51]/5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">Memory 0x9B8C</span>
                  <span className="text-[10px] text-[#c88d51] uppercase px-1.5 py-0.5 rounded bg-[#241c16]">
                    Category: UI_THEME
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] bg-[#c88d51]/20 text-[#c88d51] border border-[#c88d51]/40">
                  CURRENT EFFECTIVE PREFERENCE
                </span>
              </div>
              <div className="text-emerald-300 font-medium">
                value: &quot;Use light interfaces from now on&quot;
              </div>
              <div className="mt-2 text-[10px] text-stone-400 flex items-center justify-between">
                <span>Source: Session 04 Explicit Update</span>
                <span>supersedes_id: 0x4A1F</span>
              </div>
            </div>
          )}

          {/* Retrieval Guarantee Output */}
          <div className="p-3.5 rounded bg-[#0f0e0c] border border-[#241f1a] text-[11px] text-stone-400 flex items-center justify-between">
            <span>Query: &quot;What UI theme does this user prefer?&quot;</span>
            <span className="text-white font-medium">
              → {activeStage === 'updated' ? 'Light interfaces (Memory 0x9B8C)' : 'Dark interfaces (Memory 0x4A1F)'}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
