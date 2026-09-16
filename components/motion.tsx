'use client';

import React, { useEffect, useRef, useState } from 'react';

/**
 * mem0-style motion system (measured from their production markup):
 *   - Reveal: opacity 0.001 -> 1, NO translate (x/y stay 0)
 *   - Tween ease [0.12, 0.23, 0.5, 1], duration 300-400ms
 *   - Container delay ~0.1s, children staggered by +0.1s steps (0.2/0.3/0.4/0.5)
 *   - Springs (0.2s, bounce 0.1) only for tiny UI pops
 *   - Announcement bar: height 0 auto-animate (accordion style)
 *   - Navbar: blur 12-13px translucent backdrop
 *
 * Our extras (mem0's interactive vocabulary, same timing language):
 * typewriter headline, auto-advancing demo stages, tab cross-fades.
 * Everything degrades to static content under prefers-reduced-motion.
 */

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/** mem0 exact reveal tokens */
export const MEM0_EASE = 'cubic-bezier(0.12, 0.23, 0.5, 1)';
export const MEM0_REVEAL_MS = 350;

interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  durationMs?: number;
  className?: string;
}

/**
 * Scroll-triggered fade-only reveal (mem0 exact: opacity 0.001 -> 1,
 * no translate, 350ms tween, their ease). Fires once via IntersectionObserver.
 */
export function Reveal({ children, delay = 100, durationMs = MEM0_REVEAL_MS, className = '' }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) {
      setVisible(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reduced]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0.001,
        transition: reduced
          ? undefined
          : `opacity ${durationMs}ms ${MEM0_EASE} ${delay}ms`,
        willChange: visible ? undefined : 'opacity',
      }}
    >
      {children}
    </div>
  );
}

interface RevealGroupProps {
  children: React.ReactNode;
  staggerMs?: number;
  className?: string;
}

/**
 * Stagger wrapper: each direct child's reveal is delayed by index × staggerMs.
 * mem0 staggers siblings in +100ms steps, so the default matches their rhythm.
 */
export function RevealGroup({ children, staggerMs = 100, className = '' }: RevealGroupProps) {
  return (
    <div className={className}>
      {React.Children.map(children, (child, i) => (
        <Reveal delay={100 + i * staggerMs}>{child}</Reveal>
      ))}
    </div>
  );
}

interface TypewriterHeadlineProps {
  phrases: string[];
  className?: string;
  typeMs?: number;
  holdMs?: number;
  deleteMs?: number;
}

/**
 * mem0-style typewriter headline: types a phrase, holds it, deletes, next.
 * Renders a block caret while animating; falls back to the first phrase
 * statically under prefers-reduced-motion.
 */
export function TypewriterHeadline({
  phrases,
  className = '',
  typeMs = 55,
  holdMs = 2400,
  deleteMs = 28,
}: TypewriterHeadlineProps) {
  const reduced = usePrefersReducedMotion();
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (reduced || phrases.length === 0) return;
    const current = phrases[phraseIdx % phrases.length];

    let timeout: number;
    if (!deleting && charCount < current.length) {
      timeout = window.setTimeout(() => setCharCount((c) => c + 1), typeMs);
    } else if (!deleting && charCount >= current.length) {
      timeout = window.setTimeout(() => setDeleting(true), holdMs);
    } else if (deleting && charCount > 0) {
      timeout = window.setTimeout(() => setCharCount((c) => c - 1), deleteMs);
    } else {
      timeout = window.setTimeout(() => {
        setDeleting(false);
        setPhraseIdx((i) => (i + 1) % phrases.length);
      }, 400);
    }
    return () => window.clearTimeout(timeout);
  }, [charCount, deleting, phraseIdx, phrases, typeMs, holdMs, deleteMs, reduced]);

  const current = phrases[phraseIdx % phrases.length] || '';
  const shown = reduced ? phrases[0] : current.slice(0, charCount);

  return (
    <span className={className} aria-label={current}>
      <span aria-hidden="true">{shown}</span>
      {!reduced && <span className="typewriter-caret" aria-hidden="true" />}
    </span>
  );
}

/**
 * Self-advancing stage timer (mem0's "Timer Wrapper" pattern).
 * Cycles an index 0..count-1 every intervalMs, pausable via the returned setter.
 */
export function useAutoStage(count: number, intervalMs = 4200): [number, (i: number) => void, boolean] {
  const [stage, setStage] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (paused || reduced || count <= 1) return;
    const timer = window.setInterval(() => setStage((s) => (s + 1) % count), intervalMs);
    return () => window.clearInterval(timer);
  }, [paused, reduced, count, intervalMs]);

  const select = (i: number) => {
    setStage(i);
    setPaused(true);
    window.setTimeout(() => setPaused(false), intervalMs * 2);
  };

  return [stage, select, paused];
}

/**
 * mem0-style animated tab switcher (bento card vocabulary).
 *
 * Matches mem0's Efficiency / Visibility / Control card:
 *   - Small tab strip: first tab is a dark pill (#181818 bg, white text),
 *     inactive tabs are plain muted labels with no background.
 *   - Content pane: icon chip, title, one-line description, then a media
 *     window (rounded 8px, object-fit cover) with a caption bar.
 *   - Stages auto-advance on a timer (mem0's "Timer Wrapper" pattern);
 *     clicking a tab selects it and pauses auto-advance briefly.
 *   - Switching is a fade-only cross-fade in mem0's exact tween language.
 */

interface AnimatedTabStage {
  label: string;
  title: string;
  description: string;
  media?: React.ReactNode;
  caption: string;
}

export function AnimatedTabs({
  stages,
  intervalMs = 5000,
}: {
  stages: AnimatedTabStage[];
  intervalMs?: number;
}) {
  const [active, select] = useAutoStage(stages.length, intervalMs);
  const stage = stages[active];

  return (
    <div>
      {/* Tab strip - mem0 style: dark active pill, plain muted inactive */}
      <div className="flex items-center gap-1 mb-6" role="tablist">
        {stages.map((s, i) => (
          <button
            key={s.label}
            role="tab"
            aria-selected={i === active}
            onClick={() => select(i)}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all duration-300 ${
              i === active
                ? 'bg-[var(--fg)] text-[var(--bg)]'
                : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Content pane */}
      {stage && (
        <div key={active} className="nue-fade-swap grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 space-y-3">
            <h3 className="text-xl font-medium text-[var(--fg)] tracking-tight">
              {stage.title}
            </h3>
            <p className="text-sm text-[var(--fg-muted)] leading-relaxed">
              {stage.description}
            </p>
          </div>
          <div className="lg:col-span-7">
            <div className="rounded-lg overflow-hidden border border-[var(--border)] bg-[var(--surface-2)]">
              {stage.media}
            </div>
            <p className="mt-2 text-[11px] font-mono text-[var(--fg-faint)]">
              {stage.caption}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
