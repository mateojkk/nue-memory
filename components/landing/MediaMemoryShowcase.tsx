'use client';

import React from 'react';
import { Sparkles, ArrowRight, Play, Check, Database, Video } from 'lucide-react';

interface MediaMemoryShowcaseProps {
  onOpenWorkspace: () => void;
}

export function MediaMemoryShowcase({ onOpenWorkspace }: MediaMemoryShowcaseProps) {
  return (
    <section id="media-memory" className="py-24 px-4 max-w-7xl mx-auto border-t border-[var(--border)] font-light">
      {/* Section Header */}
      <div className="text-left mb-14">
        <div className="text-xs font-mono text-[var(--fg-muted)] uppercase tracking-wider mb-2">
          Flagship Capability · Built on Nue Memory
        </div>
        <h2 className="text-3xl sm:text-[40px] font-medium text-[var(--fg)] tracking-tight font-sans">
          Media Memory
        </h2>
        <p className="text-[var(--fg-soft)] text-lg sm:text-xl mt-3 font-normal max-w-3xl">
          &ldquo;Your creative agent should remember how you work.&rdquo;
        </p>
        <p className="text-[var(--fg-muted)] text-sm sm:text-base mt-2 max-w-3xl font-light">
          Create once. Give feedback. Let Nue remember what matters. Then start another project without repeating yourself.
        </p>
      </div>

      {/* 2-Project Side-by-Side Flow (Exact Section 19 Specification) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mb-14">
        {/* Project 01 Card */}
        <div className="lg:col-span-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] p-6 flex flex-col justify-between shadow-xl">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <span className="text-xs font-mono text-[var(--fg-muted)] font-medium">PROJECT 01</span>
              <span className="text-[11px] font-mono text-[var(--fg-faint)]">SaaS App Promo</span>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-mono text-[var(--fg-muted)] uppercase tracking-wider block">
                User Review Feedback:
              </span>
              <div className="p-3 rounded bg-[var(--surface-2)] border border-[var(--border)] font-mono text-xs text-[var(--fg-soft)] space-y-1.5">
                <div>&bull; &ldquo;Make the captions larger.&rdquo;</div>
                <div>&bull; &ldquo;Remove dramatic music.&rdquo;</div>
                <div>&bull; &ldquo;Keep the visual style minimal.&rdquo;</div>
              </div>
            </div>

            <p className="text-xs text-[var(--fg-muted)] font-light leading-relaxed">
              Nue updates Version 2 for this project while intercepting the interaction stream.
            </p>
          </div>

          <div className="pt-4 mt-6 border-t border-[var(--border)] text-xs font-mono text-[var(--fg-faint)] flex items-center justify-between">
            <span>Feedback parsed</span>
            <span className="text-[var(--fg-muted)]">Extracted →</span>
          </div>
        </div>

        {/* Central Nue Memory Layer */}
        <div className="lg:col-span-4 rounded-xl bg-[var(--border)] border border-[var(--accent)]/40 p-6 flex flex-col justify-between shadow-xl shadow-[var(--accent)]/5 relative overflow-hidden">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <span className="text-xs font-mono text-[var(--fg)] font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[var(--fg-muted)]" />
                NUE MEMORY
              </span>
              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                <Database className="w-3 h-3" />
                Memory Store
              </span>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-mono text-[var(--fg-muted)] uppercase tracking-wider block">
                Persisted Creative Preferences:
              </span>
              <div className="space-y-2 font-mono text-xs">
                <div className="p-2.5 rounded bg-[var(--surface-2)] border border-[var(--border)] text-[var(--fg)] flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[var(--fg-muted)] shrink-0" />
                  <span>Large, high-contrast captions</span>
                </div>
                <div className="p-2.5 rounded bg-[var(--surface-2)] border border-[var(--border)] text-[var(--fg)] flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[var(--fg-muted)] shrink-0" />
                  <span>Avoid dramatic music; rhythm beds</span>
                </div>
                <div className="p-2.5 rounded bg-[var(--surface-2)] border border-[var(--border)] text-[var(--fg)] flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[var(--fg-muted)] shrink-0" />
                  <span>Minimal visual aesthetic</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-[var(--fg-muted)] font-light leading-relaxed">
              Filtered from temporary edits. Stored as structured memory objects ready for future agent queries.
            </p>
          </div>

          <div className="pt-4 mt-6 border-t border-[var(--border)] text-xs font-mono text-[var(--fg-muted)] flex items-center justify-between">
            <span>Durable encrypted storage</span>
            <span className="text-emerald-400">Durable →</span>
          </div>
        </div>

        {/* Project 02 Card */}
        <div className="lg:col-span-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] p-6 flex flex-col justify-between shadow-xl">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <span className="text-xs font-mono text-emerald-400 font-medium">PROJECT 02</span>
              <span className="text-[11px] font-mono text-[var(--fg-faint)]">New Product Launch</span>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-mono text-[var(--fg-muted)] uppercase tracking-wider block">
                User Prompt (Zero Reprompt):
              </span>
              <div className="p-3 rounded bg-[var(--surface-2)] border border-[var(--border)] font-mono text-xs text-[var(--fg)]">
                &ldquo;Create a launch video for my new product.&rdquo;
              </div>
            </div>

            <div className="p-3 rounded bg-[var(--border)] border border-emerald-900/50 text-xs font-mono text-emerald-300 space-y-1">
              <span className="text-[10px] text-emerald-400 font-medium uppercase block">
                Nue Memory Applied Automatically:
              </span>
              <div>✓ Large captions applied</div>
              <div>✓ Avoid dramatic music applied</div>
              <div>✓ Minimal aesthetic applied</div>
            </div>

            <p className="text-xs text-[var(--fg-muted)] font-light leading-relaxed">
              Nue generates the video incorporating remembered preferences without the user repeating themselves.
            </p>
          </div>

          <div className="pt-4 mt-6 border-t border-[var(--border)] text-xs font-mono text-emerald-400 flex items-center justify-between">
            <span>Result: Perfect Continuity</span>
            <span>Zero Re-prompting</span>
          </div>
        </div>
      </div>

      {/* Try Interactive Media Memory CTA */}
      <div className="p-8 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="text-left space-y-1">
          <h3 className="text-lg font-medium text-[var(--fg)] font-sans">
            Experience Media Memory in the Live Studio
          </h3>
          <p className="text-xs text-[var(--fg-muted)] font-light">
            Generate, review, and experience cross-project memory recall.
          </p>
        </div>

        <button
          onClick={onOpenWorkspace}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[var(--accent-deep)] hover:bg-[var(--accent)] text-white text-xs font-medium transition shadow-md whitespace-nowrap"
        >
          <Video className="w-4 h-4 text-white" />
          <span>Launch Media Memory Studio</span>
          <ArrowRight className="w-3.5 h-3.5 text-white" />
        </button>
      </div>
    </section>
  );
}
