'use client';

import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';

export function NueDomainsSection() {
  const [activeDomain, setActiveDomain] = useState<string>('Commercial & Ads');

  const domainTabs = [
    'Commercial & Ads',
    'Social Video',
    'Product Launch',
    'Fashion & Apparel',
    'Cinematic Stories',
  ];

  const domainCards: Record<
    string,
    Array<{ title: string; description: string }>
  > = {
    'Commercial & Ads': [
      {
        title: 'Smart Campaign Director',
        description:
          'Remembers brand guidelines, color palettes, and aspect ratios across campaigns, providing personalized video outputs that improve with every generation.',
      },
      {
        title: 'Visual Style Companion',
        description:
          'Learns what lighting, camera motion, and pacing work (and what doesn\'t) for each client, offering tailored director prompts automatically.',
      },
      {
        title: 'Episodic Consistency Engine',
        description:
          'Builds on previous episodes to deliver consistent characters, textures, and aesthetic continuity across multi-scene video workflows.',
      },
    ],
    'Social Video': [
      {
        title: 'Viral Hook Optimizer',
        description:
          'Remembers which thumbnail compositions and opening 3-second pacing yield maximum engagement across vertical video channels.',
      },
      {
        title: 'Creator Aesthetic Vault',
        description:
          'Locks down the creator\'s signature audio mix, font pairings, and color grading across TikTok, Reels, and YouTube Shorts.',
      },
      {
        title: 'Audience Feedback Learner',
        description:
          'Translates viewer comments into actionable video prompt directives for subsequent automated batch renders.',
      },
    ],
    'Product Launch': [
      {
        title: 'Feature Showcase Director',
        description:
          'Retains 3D render lighting specifications and product angle choreography across multiple announcement teasers.',
      },
      {
        title: 'Brand Tone Preserver',
        description:
          'Ensures marketing voiceover cadence and subtitle styling match company branding across global localized editions.',
      },
      {
        title: 'Iterative Revision Tracker',
        description:
          'Tracks stakeholder critique across versions, guaranteeing previous adjustments aren\'t forgotten when regenerating scenes.',
      },
    ],
    'Fashion & Apparel': [
      {
        title: 'Fabric Texture Master',
        description:
          'Remembers fine material rendering rules, specular highlight parameters, and runway motion dynamics for clothing items.',
      },
      {
        title: 'Seasonal Palette Sync',
        description:
          'Carries colorway definitions across autumn/winter and spring/summer lookbook promotional assets autonomously.',
      },
      {
        title: 'Model Pose Continuity',
        description:
          'Preserves framing consistency and model stance language throughout an entire digital catalog campaign.',
      },
    ],
    'Cinematic Stories': [
      {
        title: 'Narrative Arc Retainer',
        description:
          'Maintains world-building lore, character appearance traits, and cinematic mood across full episodic scripts.',
      },
      {
        title: 'Director Camera Lens Profile',
        description:
          'Enforces preferred anamorphic focal lengths, depth of field, and film grain simulations without repeat configuration.',
      },
      {
        title: 'Soundscape Coordinator',
        description:
          'Remembers musical leitmotifs and atmospheric sound layers, pairing audio cues consistently with recurring plot motifs.',
      },
    ],
  };

  const cards = domainCards[activeDomain] || domainCards['Commercial & Ads'];

  return (
    <section className="py-24 px-4 max-w-7xl mx-auto bg-white border-t border-[#f0f0f0]">
      {/* Top Center Black Icon (Exact mem0 Image 5 Icon) */}
      <div className="flex justify-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-black flex items-center justify-center shadow-md">
          <div className="relative">
            <Sparkles className="w-6 h-6 text-[#c88d51]" />
            <div className="absolute inset-0 bg-[#c88d51] blur-md opacity-40" />
          </div>
        </div>
      </div>

      {/* Main Headline & Subtitle (Exact mem0 Image 5 with Nue) */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <h2 className="text-3xl sm:text-5xl font-extrabold text-[#18120e] tracking-tight mb-4 font-sans">
          Creative memory that adapts to your domain
        </h2>
        <p className="text-stone-500 text-base sm:text-lg font-normal">
          Nue helps Livepeer Agent remember what matters.
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
                className={`py-4 text-sm font-semibold transition relative whitespace-nowrap ${
                  isActive ? 'text-[#18120e]' : 'text-stone-500 hover:text-[#18120e]'
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
              <h3 className="text-2xl font-bold text-[#18120e] tracking-tight leading-snug mb-4 group-hover:text-[#9c4e1f] transition font-sans">
                {card.title}
              </h3>
            </div>
            <p className="text-stone-500 text-xs sm:text-sm leading-relaxed font-normal">
              {card.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
