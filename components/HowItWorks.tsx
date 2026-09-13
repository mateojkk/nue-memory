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
    <section id="how-it-works" className="py-24 px-4 max-w-7xl mx-auto border-t border-[#e7e2da] relative">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#f5ece4] border border-[#e2d5c5] text-[#78350f] text-xs font-mono font-semibold mb-4">
          <RefreshCw className="w-3.5 h-3.5" />
          <span>The Memory Loop</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#18120e] mb-4">
          How Nue Memory{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9c4e1f] via-[#c88d51] to-[#b45a27]">
            learns and remembers
          </span>
        </h2>
        <p className="text-sm sm:text-base text-[#786152] leading-relaxed">
          From first generation to perpetual creative recall across every project, brand, and media format.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 relative">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div
              key={step.number}
              className="rounded-2xl bg-white border border-[#e7e2da] hover:border-[#c88d51]/50 p-6 flex flex-col justify-between transition-all group relative overflow-hidden shadow-sm hover:shadow-xl hover:shadow-[#c88d51]/5"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <span className="text-2xl font-mono font-bold text-[#ab9482] group-hover:text-[#9c4e1f] transition">
                    {step.number}
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-[#f5ece4] border border-[#e2d5c5] flex items-center justify-center text-[#9c4e1f] group-hover:border-[#c88d51]/40 transition">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <span className="text-[10px] font-mono text-[#9c4e1f] font-bold uppercase tracking-wider block mb-1">
                  {step.subtitle}
                </span>
                <h3 className="text-lg font-bold text-[#18120e] mb-2.5 group-hover:text-[#9c4e1f] transition">
                  {step.title}
                </h3>
                <p className="text-xs text-[#786152] leading-relaxed mb-6">
                  {step.description}
                </p>
              </div>

              <div className="pt-4 border-t border-[#e7e2da] flex items-center justify-between">
                <span className="text-[10px] font-mono text-[#786152] bg-[#f5ece4] px-2.5 py-1 rounded border border-[#e2d5c5]">
                  {step.badge}
                </span>
                {idx < steps.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-[#ab9482] hidden lg:block" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
