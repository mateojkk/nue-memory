'use client';

import React from 'react';
import { Sparkles, X, Check, Shield, Database } from 'lucide-react';
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
        particleCount: 50,
        spread: 60,
        origin: { y: 0.85 },
        colors: ['#fbf7ee', '#dda15e', '#c88d51', '#9c4e1f'],
      });
    } catch {
      // ignore
    }
    onConfirmRemember();
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#0e0a08]/95 border border-[#c88d51]/40 p-4.5 shadow-2xl backdrop-blur-xl transition-all duration-300">
      {/* Ambient background brown glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-[#c88d51]/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-[#9c4e1f]/10 blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="h-6 w-6 rounded-lg bg-[#1e1510] border border-[#c88d51]/30 flex items-center justify-center text-[#dda15e]">
            <Sparkles className="w-3.5 h-3.5 text-[#c88d51]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-widest text-[#ab9482] font-semibold">
                Nue Memory
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#c88d51]/15 text-[#dda15e] border border-[#c88d51]/25">
                MemWal Cognitive Layer
              </span>
            </div>
            <h4 className="text-xs font-semibold text-white mt-0.5">
              Persistent creative preference detected
            </h4>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="h-6 w-6 rounded-lg flex items-center justify-center text-[#ab9482] hover:text-[#fbf7ee] hover:bg-white/5 transition"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="text-xs text-[#ab9482] mt-2 relative z-10 leading-relaxed">
        Save these creative preferences to Walrus so your Livepeer agent automatically remembers them across all future projects:
      </p>

      {/* Extracted preferences chips */}
      <div className="mt-3 flex flex-wrap gap-2 relative z-10">
        {detectedPreferences.map((pref, i) => (
          <div
            key={i}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#18120e] border border-[#9c4e1f]/40 text-xs text-[#f5f2eb] font-medium"
          >
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#c88d51] font-bold">
              {pref.category}
            </span>
            <span className="text-[#594235]">/</span>
            <span className="text-[#f5f2eb]">{pref.preference}</span>
          </div>
        ))}
      </div>

      {/* Durability callout */}
      <div className="flex items-center gap-2 text-[11px] text-[#ab9482] mt-3 font-mono relative z-10">
        <Database className="w-3 h-3 text-[#c88d51]" />
        <span>Decentralized memory encrypted &amp; stored on Sui Walrus via MemWal</span>
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2.5 relative z-10 pt-3 border-t border-white/5">
        <button
          onClick={handleRemember}
          disabled={isSaving}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#fbf7ee] text-[#140e0b] hover:bg-[#ede4d1] font-semibold text-xs transition shadow-md shadow-[#9c4e1f]/10 disabled:opacity-50"
        >
          <Check className="w-3.5 h-3.5 text-[#140e0b] stroke-[2.5]" />
          <span>{isSaving ? 'Persisting to Walrus...' : 'Remember in Walrus Memory'}</span>
        </button>

        <button
          onClick={onDismiss}
          className="px-4 py-2 rounded-xl bg-[#18120e] hover:bg-[#241a14] text-[#ab9482] hover:text-[#fbf7ee] border border-[#38281e] text-xs font-medium transition"
        >
          This project only
        </button>
      </div>
    </div>
  );
};

