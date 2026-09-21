'use client';

import React from 'react';
import { Sparkles, X, Check, Database } from 'lucide-react';
import confetti from 'canvas-confetti';
import { MotionPreference } from '@/lib/types';

interface MemoryConfirmationProps {
  detectedPreferences: Omit<MotionPreference, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>[];
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
    <div className="rounded-2xl bg-[var(--surface)] shadow-2xl p-4 sm:p-5 relative animate-fadeIn">
      <div className="flex items-center justify-between pb-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[var(--surface-2)] flex items-center justify-center text-[var(--accent)]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-medium text-[var(--fg)]">
              Remember this for future media?
            </h4>
            <p className="text-[10px] text-[var(--fg-muted)] font-mono">
              Identified {detectedPreferences.length} creative preference(s) in your feedback
            </p>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="p-1 rounded-md text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-2)] transition"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2 mb-4">
        {detectedPreferences.map((pref, i) => (
          <div
            key={i}
            className="p-2.5 rounded-lg bg-[var(--surface-2)] flex items-start gap-2.5 text-xs text-[var(--fg)]"
          >
            <span className="text-[9px] font-mono font-medium uppercase px-2 py-0.5 rounded bg-[var(--surface)] text-[var(--accent)] shrink-0 mt-0.5">
              {pref.category}
            </span>
            <span className="font-medium flex-1 leading-snug text-[var(--fg)]">{pref.preference}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2">
        <span className="text-[11px] text-[var(--fg-muted)] flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span>Applies to future videos</span>
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={onDismiss}
            disabled={isSaving}
            className="px-3 py-1.5 rounded-md text-xs font-medium text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-2)] transition"
          >
            This project only
          </button>

          <button
            onClick={handleRemember}
            disabled={isSaving}
            className="px-4 py-1.5 rounded-md bg-[var(--accent-deep)] hover:bg-[var(--accent)] text-[#4a2c0e] text-xs font-medium flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{isSaving ? 'Saving...' : 'Save Preference'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
