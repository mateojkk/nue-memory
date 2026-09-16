'use client';

import React from 'react';
import { ArrowRight, Check, X, Split, Database, Sparkles } from 'lucide-react';
import { Reveal, useAutoStage } from '@/components/motion';

export function DifferentiatorSection() {
  // mem0-style self-advancing demo scenarios (pauses briefly on manual pick)
  const [selectedExample, selectExample] = useAutoStage(3, 6000);

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
      persistentExplanation: 'Global styling directive · Persisted durably · Applied across all new projects',
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
    <section id="product" className="py-24 px-4 max-w-7xl mx-auto border-t border-[var(--border)] font-light">
      {/* Section Header */}
      <Reveal>
        <div className="text-left mb-14">
        <div className="text-xs font-medium text-[var(--fg-muted)] uppercase tracking-wider mb-2">
          The Core Differentiator
        </div>
        <h2 className="text-3xl sm:text-[40px] font-medium text-[var(--fg)] tracking-tight font-sans max-w-3xl leading-[1.12]">
          Memory is more than storing conversations.
        </h2>
        <p className="text-[var(--fg-muted)] text-sm sm:text-base mt-4 max-w-3xl leading-relaxed font-light">
          Chat logs in a vector DB is not memory. Nue decides what is worth remembering, filters noise, and evolves stored context.
        </p>
        </div>
      </Reveal>

      {/* Interactive Splitter Demonstration */}
      <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-6 sm:p-10 space-y-8">
        {/* mem0-style tab strip: dark active pill, plain muted inactive */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-[var(--border)]" role="tablist">
          <span className="text-xs font-medium text-[var(--fg-faint)] uppercase tracking-wider mr-2">
            Example Input:
          </span>
          {examples.map((ex, idx) => (
            <button
              key={idx}
              role="tab"
              aria-selected={selectedExample === idx}
              onClick={() => selectExample(idx)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition whitespace-nowrap ${
                selectedExample === idx
                  ? 'bg-[var(--fg)] text-[var(--bg)] font-medium'
                  : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
              }`}
            >
              Scenario 0{idx + 1}
            </button>
          ))}
        </div>

        {/* Raw Interaction Container - cross-fades on scenario switch */}
        <div key={selectedExample} className="nue-fade-swap">
          <div className="text-xs font-medium text-[var(--fg-muted)] mb-2 flex items-center justify-between">
            <span>RAW AGENT INTERACTION STREAM</span>
            <span className="text-[var(--fg-muted)] text-[11px]">Nue Real-Time Parser</span>
          </div>
          <div className="p-4 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] font-medium text-sm text-[var(--fg)] leading-relaxed shadow-inner">
            &ldquo;{active.rawInput}&rdquo;
          </div>
        </div>

        {/* The Visual Split: Temporary vs Persistent - cross-fades with scenario */}
        <div key={`split-${selectedExample}`} className="nue-fade-swap grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Box 1: Temporary Edit */}
          <div className="p-6 rounded-lg bg-[var(--surface-2)] border border-red-950/40 relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-medium font-medium uppercase bg-red-950/40 text-red-400 border border-red-900/40">
                  <X className="w-3 h-3" />
                  TEMPORARY EDIT
                </span>
                <span className="text-[11px] font-medium text-[var(--fg-faint)]">Filtered Out</span>
              </div>

              <div className="p-3.5 rounded bg-[var(--surface)] border border-[var(--border)] font-medium text-xs text-[var(--fg-soft)]">
                &ldquo;{active.temporaryPart}&rdquo;
              </div>

              <p className="text-xs text-[var(--fg-muted)] font-light leading-relaxed">
                {active.temporaryExplanation}
              </p>
            </div>

            <div className="pt-4 mt-4 border-t border-[var(--border)] text-[11px] font-medium text-[var(--fg-faint)] flex items-center justify-between">
              <span>Status: Used for this task</span>
              <span className="text-red-400/80">Not persisted</span>
            </div>
          </div>

          {/* Box 2: Persistent Memory */}
          <div className="p-6 rounded-lg bg-[var(--surface-2)] border border-[var(--accent)]/40 relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-medium font-medium uppercase bg-[var(--accent)]/20 text-[var(--fg-muted)] border border-[var(--accent)]/40">
                  <Check className="w-3 h-3" />
                  PERSISTENT MEMORY
                </span>
                <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  Durable Memory
                </span>
              </div>

              <div className="p-3.5 rounded bg-[var(--surface)] border border-[var(--border)] font-medium text-xs text-[var(--fg)]">
                &ldquo;{active.persistentPart}&rdquo;
              </div>

              <p className="text-xs text-[var(--fg-muted)] font-light leading-relaxed">
                {active.persistentExplanation}
              </p>
            </div>

            <div className="pt-4 mt-4 border-t border-[var(--border)] text-[11px] font-medium text-[var(--fg-muted)] flex items-center justify-between">
              <span>Status: Stored in Nue Memory</span>
              <span className="text-[var(--fg-muted)] font-medium">Available to future tasks</span>
            </div>
          </div>
        </div>

        {/* Summary Differentiator Checklist */}
        <div className="pt-6 border-t border-[var(--border)] grid grid-cols-1 sm:grid-cols-3 gap-6 font-medium text-xs">
          <div>
            <span className="text-[var(--fg-muted)] block mb-1">01. What to Remember</span>
            <p className="text-[var(--fg-muted)] font-sans text-xs font-light">
              Distinguishes short-lived feedback from durable user preferences autonomously.
            </p>
          </div>
          <div>
            <span className="text-[var(--fg-muted)] block mb-1">02. Representation</span>
            <p className="text-[var(--fg-muted)] font-sans text-xs font-light">
              Converts raw chat text into structured, typed memory objects with confidence scores.
            </p>
          </div>
          <div>
            <span className="text-[var(--fg-muted)] block mb-1">03. Conflict Resolution</span>
            <p className="text-[var(--fg-muted)] font-sans text-xs font-light">
              When preferences shift, older records are superseded rather than accumulating contradictions.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
