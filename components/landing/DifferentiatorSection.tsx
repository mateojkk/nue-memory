'use client';

import React, { useState } from 'react';
import { ArrowRight, Check, X, Split, Database, Sparkles } from 'lucide-react';

export function DifferentiatorSection() {
  const [selectedExample, setSelectedExample] = useState<number>(0);

  const examples = [
    {
      rawInput: 'Make this image brighter, and remember that I prefer bright, minimal visuals.',
      temporaryPart: 'Make this image brighter.',
      temporaryExplanation: 'Specific revision to current asset · Used for this task · Not persisted',
      persistentPart: 'I prefer bright, minimal visuals.',
      persistentCategory: 'visual_style',
      persistentExplanation: 'Long-term preference · Stored in Nue Memory · Available to future tasks',
    },
    {
      rawInput: 'The intro cut is too slow for this clip. From now on, make all captions much larger.',
      temporaryPart: 'The intro cut is too slow for this clip.',
      temporaryExplanation: 'Local pacing tweak · Discarded from agent memory after export',
      persistentPart: 'Make all captions much larger.',
      persistentCategory: 'typography',
      persistentExplanation: 'Global styling directive · Persisted to Walrus · Applied across all new projects',
    },
    {
      rawInput: 'Fix the syntax error in line 42, and enforce strict typing without any across this repo.',
      temporaryPart: 'Fix the syntax error in line 42.',
      temporaryExplanation: 'One-off debugging fix · No cross-session storage needed',
      persistentPart: 'Enforce strict typing without any.',
      persistentCategory: 'coding_style',
      persistentExplanation: 'Architectural convention · Auto-injected in future coding agent sessions',
    },
  ];

  const active = examples[selectedExample];

  return (
    <section id="product" className="py-24 px-4 max-w-7xl mx-auto border-t border-[#211b17] font-light">
      {/* Section Header */}
      <div className="text-left mb-14">
        <div className="text-xs font-mono text-[#c88d51] uppercase tracking-wider mb-2">
          The Core Differentiator
        </div>
        <h2 className="text-3xl sm:text-5xl font-medium text-white tracking-tight font-sans max-w-3xl leading-[1.12]">
          Memory is more than storing conversations.
        </h2>
        <p className="text-stone-400 text-sm sm:text-base mt-4 max-w-3xl leading-relaxed font-light">
          A naive vector database dumps raw chat history into context windows, resulting in prompt clutter, high token costs, and contradictory rules. Nue provides intelligence around memory: deciding what is worth remembering, filtering temporary instructions, and continuously evolving stored context.
        </p>
      </div>

      {/* Interactive Splitter Demonstration */}
      <div className="rounded-xl bg-[#12100e] border border-[#26211d] p-6 sm:p-10 shadow-2xl space-y-8">
        {/* Example Picker Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#241f1a]">
          <span className="text-xs font-mono text-stone-500 uppercase tracking-wider mr-2">
            Example Input:
          </span>
          {examples.map((ex, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedExample(idx)}
              className={`px-3 py-1.5 rounded-md text-xs font-mono transition whitespace-nowrap ${
                selectedExample === idx
                  ? 'bg-[#2b241e] text-white border border-[#c88d51]/40'
                  : 'bg-[#171411] text-stone-400 hover:text-white border border-[#241e1a]'
              }`}
            >
              Scenario 0{idx + 1}
            </button>
          ))}
        </div>

        {/* Raw Interaction Container */}
        <div>
          <div className="text-xs font-mono text-stone-400 mb-2 flex items-center justify-between">
            <span>RAW AGENT INTERACTION STREAM</span>
            <span className="text-[#c88d51] text-[11px]">Nue Real-Time Parser</span>
          </div>
          <div className="p-4 rounded-lg bg-[#181512] border border-[#2d251f] font-mono text-sm text-stone-100 leading-relaxed shadow-inner">
            &ldquo;{active.rawInput}&rdquo;
          </div>
        </div>

        {/* The Visual Split: Temporary vs Persistent */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Box 1: Temporary Edit */}
          <div className="p-6 rounded-lg bg-[#161311] border border-red-950/40 relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-mono font-medium uppercase bg-red-950/40 text-red-400 border border-red-900/40">
                  <X className="w-3 h-3" />
                  TEMPORARY EDIT
                </span>
                <span className="text-[11px] font-mono text-stone-500">Filtered Out</span>
              </div>

              <div className="p-3.5 rounded bg-[#0f0e0c] border border-[#241e1a] font-mono text-xs text-stone-300">
                &ldquo;{active.temporaryPart}&rdquo;
              </div>

              <p className="text-xs text-stone-400 font-light leading-relaxed">
                {active.temporaryExplanation}
              </p>
            </div>

            <div className="pt-4 mt-4 border-t border-[#241e1a] text-[11px] font-mono text-stone-500 flex items-center justify-between">
              <span>Status: Used for this task</span>
              <span className="text-red-400/80">Not persisted</span>
            </div>
          </div>

          {/* Box 2: Persistent Memory */}
          <div className="p-6 rounded-lg bg-[#181512] border border-[#c88d51]/40 relative overflow-hidden flex flex-col justify-between shadow-lg shadow-[#c88d51]/5">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-mono font-medium uppercase bg-[#c88d51]/20 text-[#c88d51] border border-[#c88d51]/40">
                  <Check className="w-3 h-3" />
                  PERSISTENT MEMORY
                </span>
                <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  Walrus Blob
                </span>
              </div>

              <div className="p-3.5 rounded bg-[#0f0e0c] border border-[#332a22] font-mono text-xs text-white">
                &ldquo;{active.persistentPart}&rdquo;
              </div>

              <p className="text-xs text-stone-400 font-light leading-relaxed">
                {active.persistentExplanation}
              </p>
            </div>

            <div className="pt-4 mt-4 border-t border-[#29221b] text-[11px] font-mono text-stone-400 flex items-center justify-between">
              <span>Status: Stored in Nue Memory</span>
              <span className="text-[#c88d51] font-medium">Available to future tasks</span>
            </div>
          </div>
        </div>

        {/* Summary Differentiator Checklist */}
        <div className="pt-6 border-t border-[#241f1a] grid grid-cols-1 sm:grid-cols-3 gap-6 font-mono text-xs">
          <div>
            <span className="text-[#c88d51] block mb-1">01. What to Remember</span>
            <p className="text-stone-400 font-sans text-xs font-light">
              Distinguishes short-lived feedback from durable user preferences autonomously.
            </p>
          </div>
          <div>
            <span className="text-[#c88d51] block mb-1">02. Representation</span>
            <p className="text-stone-400 font-sans text-xs font-light">
              Converts raw chat text into structured, typed memory objects with confidence scores.
            </p>
          </div>
          <div>
            <span className="text-[#c88d51] block mb-1">03. Conflict Resolution</span>
            <p className="text-stone-400 font-sans text-xs font-light">
              When preferences shift, older records are superseded rather than accumulating contradictions.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
