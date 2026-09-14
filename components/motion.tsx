'use client';

import React, { useEffect, useRef, useState } from 'react';

/**
 * mem0-style motion system.
 *
 * mem0.ai animation vocabulary (Framer-based, observed from their markup):
 *   - Scroll reveals: fade + 24px rise, ~600ms out-quart-ish ease, 80-150ms stagger
 *   - Once-only triggers (no re-animation on scroll-up)
 *   - Typewriter hero headline with block caret
 *   - Self-advancing demo timers (Timer Wrapper components cycling stages)
 *   - Opacity cross-fades on tab switches, never layout shifts on hover
 *
 * All of it degrades to static content under prefers-reduced-motion.
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

interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}

/** Scroll-triggered fade + rise reveal. Fires once, IntersectionObserver-driven. */
export function Reveal({ children, delay = 0, y = 24, className = '' }: RevealProps) {
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
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : `translateY(${y}px)`,
        transition: reduced
          ? undefined
          : `opacity 600ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, transform 600ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
        willChange: visible ? undefined : 'opacity, transform',
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
 * Children must be wrapped in <RevealItem> — or any element works standalone.
 */
export function RevealGroup({ children, staggerMs = 90, className = '' }: RevealGroupProps) {
  return (
    <div className={className}>
      {React.Children.map(children, (child, i) => (
        <Reveal delay={i * staggerMs}>{child}</Reveal>
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
 * Self-advancing stage timer (mirrors mem0's demo "Timer Wrapper" pattern).
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
