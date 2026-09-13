'use client';

import React from 'react';
import { Sparkles, ArrowRight, Play, Check, Database, Video } from 'lucide-react';

interface MediaMemoryShowcaseProps {
  onOpenWorkspace: () => void;
}

export function MediaMemoryShowcase({ onOpenWorkspace }: MediaMemoryShowcaseProps) {
  return (
    <section id="media-memory" className="py-24 px-4 max-w-7xl mx-auto border-t border-[#211b17] font-light">
      {/* Section Header */}
      <div className="text-left mb-14">
        <div className="text-xs font-mono text-[#c88d51] uppercase tracking-wider mb-2">
          Flagship Capability · Built on Nue Memory
        </div>
        <h2 className="text-3xl sm:text-5xl font-medium text-white tracking-tight font-sans">
          Media Memory
        </h2>
        <p className="text-stone-300 text-lg sm:text-xl mt-3 font-normal max-w-3xl">
          &ldquo;Your creative agent should remember how you work.&rdquo;
        </p>
        <p className="text-stone-400 text-sm sm:text-base mt-2 max-w-3xl font-light">
          Create once. Give feedback. Let Nue remember what matters. Then start another project without repeating yourself. Powered by Livepeer Agent for media execution and Sui Walrus for persistence.
        </p>
      </div>

      {/* 2-Project Side-by-Side Flow (Exact Section 19 Specification) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mb-14">
        {/* Project 01 Card */}
        <div className="lg:col-span-4 rounded-xl bg-[#12100e] border border-[#26211d] p-6 flex flex-col justify-between shadow-xl">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#211b17]">
              <span className="text-xs font-mono text-[#c88d51] font-medium">PROJECT 01</span>
              <span className="text-[11px] font-mono text-stone-500">SaaS App Promo</span>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-mono text-stone-400 uppercase tracking-wider block">
                User Review Feedback:
              </span>
              <div className="p-3 rounded bg-[#181512] border border-[#2d251f] font-mono text-xs text-stone-300 space-y-1.5">
                <div>&bull; &ldquo;Make the captions larger.&rdquo;</div>
                <div>&bull; &ldquo;Remove dramatic music.&rdquo;</div>
                <div>&bull; &ldquo;Keep the visual style minimal.&rdquo;</div>
              </div>
            </div>

            <p className="text-xs text-stone-400 font-light leading-relaxed">
              Livepeer Agent updates Version 2 for this project while Nue intercepts the interaction stream.
            </p>
          </div>

          <div className="pt-4 mt-6 border-t border-[#211b17] text-xs font-mono text-stone-500 flex items-center justify-between">
            <span>Feedback parsed</span>
            <span className="text-[#c88d51]">Extracted →</span>
          </div>
        </div>

        {/* Central Nue Memory Layer */}
        <div className="lg:col-span-4 rounded-xl bg-[#161310] border border-[#c88d51]/40 p-6 flex flex-col justify-between shadow-xl shadow-[#c88d51]/5 relative overflow-hidden">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2b221b]">
              <span className="text-xs font-mono text-white font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#c88d51]" />
                NUE MEMORY
              </span>
              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                <Database className="w-3 h-3" />
                Walrus MemWal
              </span>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-mono text-stone-400 uppercase tracking-wider block">
                Persisted Creative Preferences:
              </span>
              <div className="space-y-2 font-mono text-xs">
                <div className="p-2.5 rounded bg-[#1f1a15] border border-[#382b20] text-stone-200 flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#c88d51] shrink-0" />
                  <span>Large, high-contrast captions</span>
                </div>
                <div className="p-2.5 rounded bg-[#1f1a15] border border-[#382b20] text-stone-200 flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#c88d51] shrink-0" />
                  <span>Avoid dramatic music; rhythm beds</span>
                </div>
                <div className="p-2.5 rounded bg-[#1f1a15] border border-[#382b20] text-stone-200 flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#c88d51] shrink-0" />
                  <span>Minimal visual aesthetic</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-stone-400 font-light leading-relaxed">
              Filtered from temporary edits. Stored as structured memory objects ready for future agent queries.
            </p>
          </div>

          <div className="pt-4 mt-6 border-t border-[#2b221b] text-xs font-mono text-stone-400 flex items-center justify-between">
            <span>Decoupled Walrus storage</span>
            <span className="text-emerald-400">Durable →</span>
          </div>
        </div>

        {/* Project 02 Card */}
        <div className="lg:col-span-4 rounded-xl bg-[#12100e] border border-[#26211d] p-6 flex flex-col justify-between shadow-xl">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#211b17]">
              <span className="text-xs font-mono text-emerald-400 font-medium">PROJECT 02</span>
              <span className="text-[11px] font-mono text-stone-500">New Product Launch</span>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-mono text-stone-400 uppercase tracking-wider block">
                User Prompt (Zero Reprompt):
              </span>
              <div className="p-3 rounded bg-[#181512] border border-[#2d251f] font-mono text-xs text-white">
                &ldquo;Create a launch video for my new product.&rdquo;
              </div>
            </div>

            <div className="p-3 rounded bg-[#181e18] border border-emerald-900/50 text-xs font-mono text-emerald-300 space-y-1">
              <span className="text-[10px] text-emerald-400 font-medium uppercase block">
                Nue Memory Applied Automatically:
              </span>
              <div>✓ Large captions applied</div>
              <div>✓ Avoid dramatic music applied</div>
              <div>✓ Minimal aesthetic applied</div>
            </div>

            <p className="text-xs text-stone-400 font-light leading-relaxed">
              Livepeer Agent generates the video incorporating remembered preferences without the user repeating themselves.
            </p>
          </div>

          <div className="pt-4 mt-6 border-t border-[#211b17] text-xs font-mono text-emerald-400 flex items-center justify-between">
            <span>Result: Perfect Continuity</span>
            <span>Zero Re-prompting</span>
          </div>
        </div>
      </div>

      {/* Try Interactive Media Memory CTA */}
      <div className="p-8 rounded-xl bg-[#141210] border border-[#26211d] flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="text-left space-y-1">
          <h3 className="text-lg font-medium text-white font-sans">
            Experience Media Memory in the Live Studio
          </h3>
          <p className="text-xs text-stone-400 font-light">
            Generate with Livepeer Agent, review with feedback, and experience cross-project memory recall.
          </p>
        </div>

        <button
          onClick={onOpenWorkspace}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#c88d51] hover:bg-[#dda15e] text-[#0c0a09] text-xs font-medium transition shadow-md whitespace-nowrap"
        >
          <Video className="w-4 h-4 text-[#0c0a09]" />
          <span>Launch Media Memory Studio</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#0c0a09]" />
        </button>
      </div>
    </section>
  );
}
