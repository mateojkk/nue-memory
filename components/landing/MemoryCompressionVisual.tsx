'use client';

import React from 'react';
import { useAutoStage } from '@/components/motion';

/**
 * Code-driven product visual (mem0's Memory-Compression-Engine.mp4, but live).
 *
 * Looping animation of Nue compressing a noisy interaction stream into one
 * compact memory object: steps light up in sequence while the token bar
 * shrinks and the final chip appears. No video file, no screen recording.
 * Freezes on its final frame under prefers-reduced-motion.
 */

const STEPS = [
  { label: 'add memory', detail: 'raw interaction stream' },
  { label: 'extract', detail: 'durable signal isolated' },
  { label: 'filter noise', detail: 'one-off edits discarded' },
  { label: 'structure', detail: 'typed memory object' },
  { label: 'persist', detail: 'durable encrypted store' },
];

const START_TOKENS = 2480;
const END_TOKENS = 96;

export function MemoryCompressionVisual() {
  // One extra stage holds the finished state before looping
  const [stage] = useAutoStage(STEPS.length + 1, 1400);
  const done = Math.min(stage, STEPS.length);
  const finished = stage >= STEPS.length;

  const tokens = Math.round(START_TOKENS - ((START_TOKENS - END_TOKENS) * done) / STEPS.length);
  const barPct = Math.max(4, 100 - (done / STEPS.length) * 92);

  return (
    <div className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-4">
      <span className="text-xs font-medium uppercase tracking-wider text-[var(--fg-muted)] font-medium block">
        Execution Workflow
      </span>

      {/* Token compression bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between font-mono text-[11px]">
          <span className="text-[var(--fg-faint)] uppercase tracking-wider">Context tokens</span>
          <span className="text-[var(--fg-soft)] tabular-nums">{tokens.toLocaleString()}</span>
        </div>
        <div className="h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all duration-1000"
            style={{ width: `${barPct}%`, transitionTimingFunction: 'cubic-bezier(0.12, 0.23, 0.5, 1)' }}
          />
        </div>
      </div>

      {/* Sequential steps */}
      <div className="space-y-3 font-mono text-xs">
        {STEPS.map((s, i) => {
          const lit = i < done;
          const current = i === done && !finished;
          return (
            <div key={s.label}>
              <div className="flex items-center gap-3">
                <span
                  className={`w-5 h-5 rounded flex items-center justify-center text-[10px] border transition-all duration-500 ${
                    lit
                      ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                      : current
                      ? 'border-[var(--accent)] text-[var(--accent)]'
                      : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--fg-faint)]'
                  }`}
                >
                  {lit ? '✓' : i + 1}
                </span>
                <span className={lit || current ? 'text-[var(--fg)]' : 'text-[var(--fg-faint)]'}>
                  {s.label}
                </span>
                <span className="text-[var(--fg-faint)] text-[10px] truncate">{s.detail}</span>
              </div>
              {i < STEPS.length - 1 && <div className="w-px h-3 bg-[var(--border)] ml-2.5" />}
            </div>
          );
        })}
      </div>

      {/* Final compact memory chip — appears when the loop completes */}
      <div
        className="rounded-lg border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-3 py-2.5 font-mono text-[11px] text-[var(--fg)] flex items-center justify-between transition-all duration-500"
        style={{ opacity: finished ? 1 : 0.25 }}
      >
        <span>memory_object.json · 96% fewer tokens</span>
        <span className="text-[var(--accent)]">●</span>
      </div>
    </div>
  );
}
