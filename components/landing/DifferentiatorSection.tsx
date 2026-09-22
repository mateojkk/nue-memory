'use client';

import React from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { Reveal } from '@/components/motion';

interface DifferentiatorSectionProps {
  onOpenWorkspace?: () => void;
}

/**
 * The whole learning story in one band: tell your taste once, it is saved
 * as a standing rule, every future render recalls it. Real example from the
 * studio (music fade-out), real pipeline behavior, no interactivity bulk.
 */
export function DifferentiatorSection({ onOpenWorkspace }: DifferentiatorSectionProps = {}) {
  const steps = [
    {
      n: '01',
      title: 'Say it once',
      body: '\u201CI like having the sound fade out at the end.\u201D No menus, no settings page - just tell the director in plain words.',
    },
    {
      n: '02',
      title: 'It is remembered',
      body: 'The studio distills a standing rule - music: fade the soundtrack out at the end - and stores it durably. Renders never start from preference sentences.',
    },
    {
      n: '03',
      title: 'Every render recalls it',
      body: 'Your next brief can skip audio entirely. The rule is recalled and applied automatically - zero re-prompting.',
    },
  ];

  return (
    <section id="product" className="py-24 px-4 max-w-7xl mx-auto font-light">
      <Reveal>
        <div className="text-left mb-12">
          <div className="text-xs font-medium text-[var(--fg-muted)] uppercase tracking-wider mb-2">
            How learning works
          </div>
          <h2 className="text-3xl sm:text-[40px] font-medium text-[var(--fg)] tracking-tight font-sans max-w-3xl leading-[1.12]">
            Tell your taste once. Never repeat it.
          </h2>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {steps.map((s, idx) => (
          <Reveal key={s.n} delay={idx * 90}>
            <div className="p-6 rounded-xl bg-[var(--surface)] shadow-xs flex flex-col justify-between min-h-[190px]">
              <div className="space-y-3">
                <span className="text-[11px] font-mono text-[var(--fg-faint)]">{s.n}</span>
                <h3 className="text-base font-medium text-[var(--fg)] font-sans">{s.title}</h3>
                <p className="text-xs text-[var(--fg-muted)] font-light leading-relaxed">{s.body}</p>
              </div>
              {idx === 2 && (
                <div className="pt-4 mt-4 flex items-center gap-1.5 text-[11px] text-emerald-400">
                  <Check className="w-3.5 h-3.5" />
                  <span>One-off tweaks are never stored - only standing taste.</span>
                </div>
              )}
            </div>
          </Reveal>
        ))}
      </div>

      {onOpenWorkspace && (
        <Reveal delay={120}>
          <div className="mt-8 flex justify-start">
            <button
              onClick={onOpenWorkspace}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-[var(--accent-deep)] hover:bg-[var(--accent)] text-[#4a2c0e] text-sm font-medium transition shadow-sm hover:scale-105 active:scale-95 duration-200"
            >
              <span>Try it - $10 free credit</span>
              <ArrowRight className="w-4 h-4 text-[#4a2c0e]" />
            </button>
          </div>
        </Reveal>
      )}
    </section>
  );
}
