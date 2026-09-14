'use client';

import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';

export function NueDomainsSection() {
  const [activeDomain, setActiveDomain] = useState<string>('Coding Agents');

  const domainTabs = [
    'Coding Agents',
    'Research Agents',
    'Creative Media',
    'Personal Assistants',
    'Enterprise CRM',
  ];

  const domainCards: Record<
    string,
    Array<{ title: string; description: string }>
  > = {
    'Coding Agents': [
      {
        title: 'Repository Architecture Copilot',
        description:
          'Remembers repo conventions, monorepo structures, and custom lint rules across pull requests so agents never violate project guidelines.',
      },
      {
        title: 'Toolchain & Dependency Memory',
        description:
          'Recalls package managers, test runners, and build configurations across workspace sessions without requiring repeated configuration.',
      },
      {
        title: 'Bug & Refactor Ledger',
        description:
          'Preserves historical debugging traces and previously attempted solutions to avoid repeating dead-end fixes in subsequent runs.',
      },
    ],
    'Research Agents': [
      {
        title: 'Literature Synthesis Engine',
        description:
          'Retains primary sources, author citations, and paper abstracts across multi-week academic investigations without prompt overflow.',
      },
      {
        title: 'Hypothesis Evolution Tracker',
        description:
          'Records how working theories change as new data points emerge, maintaining a rigorous audit trail of evidence and conclusions.',
      },
      {
        title: 'Domain Knowledge Graph',
        description:
          'Constructs persistent topic graphs and key definitions that sharpen every subsequent query and agent investigation.',
      },
    ],
    'Creative Media': [
      {
        title: 'Art Direction & Style Engine',
        description:
          'Preserves color palettes, aspect ratios, typography rules, and aesthetic guidance across generation batches for complete brand fidelity.',
      },
      {
        title: 'Episodic Video Continuity',
        description:
          'Retains character appearances, scene lighting, and audio grading preferences for multi-shot video production across sessions.',
      },
      {
        title: 'Asset Metadata Graph',
        description:
          'Tracks prompt revisions, seed records, and model weights across Livepeer and Walrus pipelines for seamless asset provenance.',
      },
    ],
    'Personal Assistants': [
      {
        title: 'Contextual Schedule Manager',
        description:
          'Remembers meeting preferences, focus hour blocks, and calendar nuances across weeks to automate scheduling without friction.',
      },
      {
        title: 'Personal Preference Ledger',
        description:
          'Learns dietary choices, travel habits, and communication preferences over time without redundant questioning.',
      },
      {
        title: 'Cross-Session Continuity',
        description:
          'Picks up conversations exactly where they left off, eliminating repetitive context re-establishment across agent restarts.',
      },
    ],
    'Enterprise CRM': [
      {
        title: 'Account Relationship Graph',
        description:
          'Retains stakeholder priorities, executive buying signals, and historical objections across multi-month sales cycles.',
      },
      {
        title: 'Compliance & Policy Guardian',
        description:
          'Enforces internal data policies, NDA boundaries, and regulatory rules consistently across all enterprise agent workflows.',
      },
      {
        title: 'Institutional Knowledge Base',
        description:
          'Preserves organizational decisions and operational patterns so new agents don\'t start from zero when onboarding.',
      },
    ],
  };

  const cards = domainCards[activeDomain] || domainCards['Coding Agents'];

  return (
    <section className="py-24 px-4 max-w-7xl mx-auto bg-white border-t border-[var(--surface)] font-light">
      {/* Top Center Black Icon (Exact Image 5) */}
      <div className="flex justify-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-black flex items-center justify-center shadow-md">
          <div className="relative">
            <Sparkles className="w-6 h-6 text-[var(--accent)]" />
            <div className="absolute inset-0 bg-[var(--accent)] blur-md opacity-40" />
          </div>
        </div>
      </div>

      {/* Main Headline & Subtitle (Exact Image 5) */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <h2 className="text-3xl sm:text-5xl font-medium text-[var(--surface)] tracking-tight mb-4 font-sans">
          AI memory that adapts to your domain
        </h2>
        <p className="text-[var(--fg-faint)] text-base sm:text-lg font-light">
          Nue helps AI remember what matters.
        </p>
      </div>

      {/* Domain Category Tabs (Exact Image 5: Healthcare | Education | E-commerce | Customer Support | Sales & CRM) */}
      <div className="flex items-center justify-center border-b border-[var(--surface-2)] mb-12 overflow-x-auto">
        <div className="flex items-center gap-8 sm:gap-12 min-w-max px-4">
          {domainTabs.map((tab) => {
            const isActive = activeDomain === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveDomain(tab)}
                className={`py-4 text-sm font-medium transition relative whitespace-nowrap ${
                  isActive ? 'text-[var(--surface)]' : 'text-[var(--fg-faint)] hover:text-[var(--surface)] font-light'
                }`}
              >
                <span>{tab}</span>
                {isActive && (
                  <span className="absolute bottom-0 inset-x-0 h-[2px] bg-[var(--surface)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3 Domain Cards Side-by-Side (Exact Image 5 Layout) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card) => (
          <div
            key={card.title}
            className="rounded-2xl border border-[var(--surface-2)] p-8 bg-white min-h-[300px] flex flex-col justify-between hover:shadow-lg transition-all duration-300 group"
          >
            <div>
              <h3 className="text-2xl font-medium text-[var(--surface)] tracking-tight leading-snug mb-4 group-hover:text-[var(--accent-deep)] transition font-sans">
                {card.title}
              </h3>
            </div>
            <p className="text-[var(--fg-faint)] text-xs sm:text-sm leading-relaxed font-light">
              {card.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
