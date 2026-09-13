'use client';

import React from 'react';
import { Sparkles, MessageSquare, Database, RefreshCw, ArrowRight } from 'lucide-react';

export function HowItWorks() {
  const steps = [
    {
      number: '01',
      icon: Sparkles,
      title: 'Direct Creative Agent',
      subtitle: 'Raw Generation',
      description:
        'Instruct Livepeer Agent using plain language. The agent composes video, soundtrack, and captions via hosted MCP tools.',
      badge: 'Livepeer Agent MCP',
    },
    {
      number: '02',
      icon: MessageSquare,
      title: 'Review & Refine',
      subtitle: 'Creative Feedback',
      description:
        'Provide natural critique on pacing, music, or captions. Nue Memory automatically isolates ephemeral edits from universal preferences.',
      badge: 'Autonomous Extraction',
    },
    {
      number: '03',
      icon: Database,
      title: 'Remember on Walrus',
      subtitle: 'Decentralized Storage',
      description:
        'Confirmed preferences are persisted to Sui Walrus via the MemWal SDK. Cryptographically verified and decentralized.',
      badge: 'Walrus MemWal on Sui',
    },
    {
      number: '04',
      icon: RefreshCw,
      title: 'Zero-Reprompt Recall',
      subtitle: 'Cross-Project Intelligence',
      description:
        'Start a completely new project. Nue Memory automatically retrieves your preferences and injects them into the creative prompt.',
      badge: 'Zero Reprompting',
    },
  ];

  return (
    <section id="how-it-works" className="py-24 px-4 max-w-7xl mx-auto border-t border-white/5 relative">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#18120e] border border-[#c88d51]/25 text-[#dda15e] text-xs font-mono font-medium mb-4">
          <RefreshCw className="w-3.5 h-3.5" />
          <span>The Memory Loop</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
          How Nue Memory{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#dda15e] via-[#fbf7ee] to-[#c88d51]">
            learns and remembers
          </span>
        </h2>
        <p className="text-sm sm:text-base text-[#ab9482] leading-relaxed">
          From first generation to perpetual creative recall across every project, brand, and media format.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div
              key={step.number}
              className="rounded-2xl bg-[#09090b] border border-white/10 hover:border-[#c88d51]/40 p-6 flex flex-col justify-between transition group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-radial from-[#c88d51]/5 to-transparent blur-xl pointer-events-none" />
              <div>
                <div className="flex items-center justify-between mb-6">
                  <span className="text-2xl font-mono font-bold text-[#786152] group-hover:text-[#dda15e] transition">
                    {step.number}
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-[#140e0b] border border-white/5 flex items-center justify-center text-[#dda15e] group-hover:border-[#c88d51]/40 transition">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <span className="text-[10px] font-mono text-[#dda15e] uppercase tracking-wider block mb-1">
                  {step.subtitle}
                </span>
                <h3 className="text-lg font-bold text-white mb-2.5 group-hover:text-[#fbf7ee] transition">
                  {step.title}
                </h3>
                <p className="text-xs text-[#ab9482] leading-relaxed mb-6">
                  {step.description}
                </p>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] font-mono text-zinc-500 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                  {step.badge}
                </span>
                {idx < steps.length - 1 && (
                  <ArrowRight className="w-3.5 h-3.5 text-[#786152] hidden lg:block" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
