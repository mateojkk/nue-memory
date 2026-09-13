'use client';

import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';

export function NueDomainsSection() {
  const [activeDomain, setActiveDomain] = useState<string>('Healthcare');

  const domainTabs = [
    'Healthcare',
    'Education',
    'E-commerce',
    'Customer Support',
    'Sales & CRM',
  ];

  const domainCards: Record<
    string,
    Array<{ title: string; description: string }>
  > = {
    'Healthcare': [
      {
        title: 'Smart Patient Care Assistant',
        description:
          'Remembers patient history, allergies, and treatment preferences across visits therefore providing personalized care that improves with every interaction.',
      },
      {
        title: 'Chronic Condition Companion',
        description:
          'Learns what works (and what doesn\'t) for the patient over time, offering thoughtful reminders and insights tailored to each patient\'s journey.',
      },
      {
        title: 'Therapy Progress Tracker',
        description:
          'Builds on previous sessions to deliver consistent, context-aware mental health support. Creates trust through conversations that remember what matters to each patient.',
      },
    ],
    'Education': [
      {
        title: 'Adaptive Learning Mentor',
        description:
          'Tracks student learning pace, concept mastery, and preferred problem-solving styles across semesters without starting from scratch.',
      },
      {
        title: 'Curriculum Retention Guide',
        description:
          'Recalls prior test misconceptions to deliver targeted spaced-repetition exercises tailored to the individual learner.',
      },
      {
        title: 'Research Project Companion',
        description:
          'Preserves thesis outlines, primary sources, and academic notes across multi-week research workflows.',
      },
    ],
    'E-commerce': [
      {
        title: 'Personalized Shopping Stylist',
        description:
          'Remembers sizing, aesthetic preferences, and budget constraints across multi-brand purchases to curate relevant wardrobes.',
      },
      {
        title: 'Post-Purchase Care Concierge',
        description:
          'Recalls past orders, delivery nuances, and warranty preferences to resolve support requests instantly.',
      },
      {
        title: 'Household Replenishment Agent',
        description:
          'Anticipates recurring consumable needs and suggests timely refills based on actual historical consumption patterns.',
      },
    ],
    'Customer Support': [
      {
        title: 'Zero-Repetition Resolver',
        description:
          'Ensures customers never have to repeat their issue when routed between teams, retaining full conversational history.',
      },
      {
        title: 'Technical Diagnostic Vault',
        description:
          'Logs device models, firmware configurations, and previously attempted troubleshooting steps across tickets.',
      },
      {
        title: 'VIP Account Sentiments',
        description:
          'Monitors historical customer satisfaction and recurring friction points to prioritize high-touch resolutions.',
      },
    ],
    'Sales & CRM': [
      {
        title: 'Deal Intelligence Copilot',
        description:
          'Retains stakeholder priorities, buying criteria, and competitor mentions across quarterly enterprise sales calls.',
      },
      {
        title: 'Executive Relationship Ledger',
        description:
          'Preserves account history, key milestones, and personal rapport notes across long multi-agent sales cycles.',
      },
      {
        title: 'Pipeline Velocity Booster',
        description:
          'Surfaces proven objection-handling strategies and relevant case studies based on similar historical winning deals.',
      },
    ],
  };

  const cards = domainCards[activeDomain] || domainCards['Healthcare'];

  return (
    <section className="py-24 px-4 max-w-7xl mx-auto bg-white border-t border-[#f0f0f0] font-light">
      {/* Top Center Black Icon (Exact Image 5) */}
      <div className="flex justify-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-black flex items-center justify-center shadow-md">
          <div className="relative">
            <Sparkles className="w-6 h-6 text-[#c88d51]" />
            <div className="absolute inset-0 bg-[#c88d51] blur-md opacity-40" />
          </div>
        </div>
      </div>

      {/* Main Headline & Subtitle (Exact Image 5) */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <h2 className="text-3xl sm:text-5xl font-medium text-[#18120e] tracking-tight mb-4 font-sans">
          AI memory that adapts to your domain
        </h2>
        <p className="text-stone-500 text-base sm:text-lg font-light">
          Nue helps AI remember what matters.
        </p>
      </div>

      {/* Domain Category Tabs (Exact Image 5: Healthcare | Education | E-commerce | Customer Support | Sales & CRM) */}
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

      {/* 3 Domain Cards Side-by-Side (Exact Image 5 Layout) */}
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
