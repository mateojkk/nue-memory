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
        title: 'Project Structure Memory',
        description:
          'Remembers how a developer structures their repositories, monorepos, module boundaries, and folder organization across sessions.',
      },
      {
        title: 'Stack & Tooling Context',
        description:
          'Retains language preferences, linter rules, testing frameworks, and dependency requirements without repeated developer prompts.',
      },
      {
        title: 'Architectural Decisions',
        description:
          'Builds on past code reviews and architectural decisions, preventing recurring mistakes and adhering to engineering standards.',
      },
    ],
    'Research Agents': [
      {
        title: 'Source Credibility Vault',
        description:
          'Remembers vetted citations, peer-reviewed sources, and verified data repositories across complex investigation threads.',
      },
      {
        title: 'Investigation Continuity',
        description:
          'Carries hypothesis evolution, counter-arguments, and synthesis notes across multi-week research projects seamlessly.',
      },
      {
        title: 'Terminology & Ontology Retainer',
        description:
          'Enforces domain-specific vocabulary and taxonomy definitions consistently throughout technical publications.',
      },
    ],
    'Creative Media': [
      {
        title: 'Media Memory on Livepeer',
        description:
          'Our first shipped capability: applies Nue to AI-generated media, remembering pacing, lighting, camera angles, and soundtrack styles.',
      },
      {
        title: 'Brand Aesthetics Companion',
        description:
          'Locks down color palettes, typography scales, and visual guidelines across multiple episodic marketing campaigns.',
      },
      {
        title: 'Cross-Project Recall',
        description:
          'When starting a new media project, retrieves persistent creative direction rules from Walrus with zero reprompting required.',
      },
    ],
    'Personal Assistants': [
      {
        title: 'Routines & Scheduling Memory',
        description:
          'Remembers deep-work windows, meeting constraints, preferred travel itineraries, and recurring calendar rules.',
      },
      {
        title: 'Personal Taste & Dietary Profile',
        description:
          'Retains culinary preferences, dietary restrictions, and lifestyle habits to guide recommendations naturally over time.',
      },
      {
        title: 'Communication Cadence',
        description:
          'Learns how concisely a user likes their summaries delivered and what tone suits different personal and professional contexts.',
      },
    ],
    'Enterprise CRM': [
      {
        title: 'Stakeholder Relationship Graph',
        description:
          'Retains organizational hierarchies, champion priorities, and decision-maker sentiment across quarterly enterprise sales cycles.',
      },
      {
        title: 'Commitment & Objections Ledger',
        description:
          'Logs contract commitments, compliance stipulations, and technical evaluation criteria across multi-agent account teams.',
      },
      {
        title: 'Historical Deal Continuity',
        description:
          'Surfaces past negotiation context and pricing benchmarks whenever a customer re-engages for contract renewals.',
      },
    ],
  };

  const cards = domainCards[activeDomain] || domainCards['Coding Agents'];

  return (
    <section className="py-24 px-4 max-w-7xl mx-auto bg-white border-t border-[#f0f0f0] font-light">
      {/* Top Center Black Icon */}
      <div className="flex justify-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-black flex items-center justify-center shadow-md">
          <div className="relative">
            <Sparkles className="w-6 h-6 text-[#c88d51]" />
            <div className="absolute inset-0 bg-[#c88d51] blur-md opacity-40" />
          </div>
        </div>
      </div>

      {/* Main Headline & Subtitle */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <h2 className="text-3xl sm:text-5xl font-medium text-[#18120e] tracking-tight mb-4 font-sans">
          AI memory that adapts to your domain
        </h2>
        <p className="text-stone-500 text-base sm:text-lg font-light">
          Nue is application-agnostic. The memory layer that helps any AI agent remember what matters.
        </p>
      </div>

      {/* Domain Category Tabs */}
      <div className="flex items-center justify-center border-b border-[#e5e5e5] mb-12 overflow-x-auto">
        <div className="flex items-center gap-8 sm:gap-12 min-w-max px-4">
          {domainTabs.map((tab) => {
            const isActive = activeDomain === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveDomain(tab)}
                className={`py-4 text-sm font-medium transition relative whitespace-nowrap ${
                  isActive ? 'text-[#18120e]' : 'text-stone-500 hover:text-[#18120e] font-light'
                }`}
              >
                <span>{tab}</span>
                {isActive && (
                  <span className="absolute bottom-0 inset-x-0 h-[2px] bg-[#18120e]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3 Domain Cards Side-by-Side */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card) => (
          <div
            key={card.title}
            className="rounded-2xl border border-[#e5e5e5] p-8 bg-white min-h-[300px] flex flex-col justify-between hover:shadow-lg transition-all duration-300 group"
          >
            <div>
              <h3 className="text-2xl font-medium text-[#18120e] tracking-tight leading-snug mb-4 group-hover:text-[#9c4e1f] transition font-sans">
                {card.title}
              </h3>
            </div>
            <p className="text-stone-500 text-xs sm:text-sm leading-relaxed font-light">
              {card.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
