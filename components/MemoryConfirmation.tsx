'use client';

import React from 'react';
import { Sparkles, X, Check, Database } from 'lucide-react';
import confetti from 'canvas-confetti';
import { MediaPreference } from '@/lib/types';

interface MemoryConfirmationProps {
  detectedPreferences: Omit<MediaPreference, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>[];
  onConfirmRemember: () => void;
  onDismiss: () => void;
  isSaving?: boolean;
}

export const MemoryConfirmation: React.FC<MemoryConfirmationProps> = ({
  detectedPreferences,
  onConfirmRemember,
  onDismiss,
  isSaving = false,
}) => {
  if (!detectedPreferences || detectedPreferences.length === 0) return null;

  const handleRemember = () => {
    try {
      confetti({
        particleCount: 45,
        spread: 55,
        origin: { y: 0.75 },
        colors: ['var(--accent)', 'var(--accent-bright)', 'var(--accent-deep)', 'var(--surface-2)'],
      });
    } catch {
      // Confetti fallback
    }
    onConfirmRemember();
  };

  return (
    <div className="rounded-2xl bg-white border-2 border-[var(--accent)]/40 shadow-xl shadow-[var(--accent)]/10 p-4 sm:p-5 relative animate-fadeIn">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--surface-2)]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[var(--surface)] border border-[var(--surface-2)] flex items-center justify-center text-[var(--accent-deep)]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-medium text-[var(--surface)]">
              Remember this for future media?
            </h4>
            <p className="text-[10px] text-[var(--fg-muted)] font-mono">
              Identified {detectedPreferences.length} creative preference(s) in your feedback
            </p>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="p-1 rounded-md text-[var(--fg-muted)] hover:text-[var(--surface)] hover:bg-[var(--surface)] transition"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2 mb-4">
        {detectedPreferences.map((pref, i) => (
          <div
            key={i}
            className="p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--surface-2)] flex items-start gap-2.5 text-xs text-[var(--surface)]"
          >
            <span className="text-[9px] font-mono font-medium uppercase px-2 py-0.5 rounded bg-[var(--surface)] text-[var(--accent-deep)] shrink-0 mt-0.5">
              {pref.category}
            </span>
            <span className="font-medium flex-1 leading-snug">{pref.preference}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2">
        <span className="text-[10px] font-mono text-[var(--fg-muted)] flex items-center gap-1">
          <Database className="w-3 h-3 text-[var(--accent-deep)]" />
          Walrus MemWal on Sui
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={onDismiss}
            disabled={isSaving}
            className="px-3 py-1.5 rounded-md text-xs font-medium text-[var(--fg-muted)] hover:text-[var(--surface)] transition"
          >
            This project only
          </button>

          <button
            onClick={handleRemember}
            disabled={isSaving}
            className="px-4 py-1.5 rounded-md bg-[var(--surface-2)] hover:bg-[var(--border)] text-[var(--fg)] text-xs font-medium flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5 text-[var(--accent-bright)]" />
            <span>{isSaving ? 'Saving...' : 'Remember in Walrus Memory'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
