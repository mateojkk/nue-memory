'use client';

import React from 'react';
import { ArrowDown, CheckCircle2 } from 'lucide-react';

export function LifecycleSection() {
  const stages = [
    {
      step: '01',
      name: 'INPUT',
      title: 'Agent Interaction Stream',
      description: 'The AI agent receives prompts, environment updates, or user review feedback.',
      tag: 'Raw Context',
    },
    {
      step: '02',
      name: 'EXTRACTION',
      title: 'Identify Information Worth Remembering',
      description: 'Semantic analysis isolates explicit directives, latent tastes, and architectural guidelines from conversational filler.',
      tag: 'Knowledge Extraction',
    },
    {
      step: '03',
      name: 'FILTERING',
      title: 'Remove Temporary Edits & Noise',
      description: 'Single-session requests ("make this brighter", "fix typo") are discarded from long-term persistence.',
      tag: 'Noise Elimination',
    },
    {
      step: '04',
      name: 'STRUCTURING',
      title: 'Convert into Typed Memory Objects',
      description: 'Unstructured natural language is normalized into schema-validated JSON objects with categories, strengths, and scopes.',
      tag: 'Schema Validation',
    },
    {
      step: '05',
      name: 'PERSISTENCE',
      title: 'Store Durable Cryptographic Blobs',
      description: 'Nue commits structured memory records to Sui Walrus decentralized storage, decoupled from any single LLM runtime.',
      tag: 'Walrus MemWal',
    },
    {
      step: '06',
      name: 'RETRIEVAL',
      title: 'Find Memories Relevant to Task',
      description: 'When the agent initiates a new project, Nue queries the memory layer and injects high-confidence context directly into the prompt.',
      tag: 'Context Injection',
    },
    {
      step: '07',
      name: 'EVOLUTION',
      title: 'Update & Supersede Conflicting Records',
      description: 'When users express updated preferences, Nue marks older conflicting records as superseded while maintaining an audit trail.',
      tag: 'Zero Contradiction',
    },
  ];

  return (
    <section className="py-24 px-4 max-w-7xl mx-auto border-t border-[#211b17] font-light">
      {/* Section Header */}
      <div className="text-left mb-16">
        <div className="text-xs font-mono text-[#c88d51] uppercase tracking-wider mb-2">
          Technical Pipeline
        </div>
        <h2 className="text-3xl sm:text-5xl font-medium text-white tracking-tight font-sans">
          The Memory Lifecycle
        </h2>
        <p className="text-stone-400 text-sm sm:text-base mt-2 max-w-2xl font-light">
          From interaction ingestion to durable retrieval and continuous evolution: how Nue powers agent continuity end-to-end.
        </p>
      </div>

      {/* Vertical / Horizontal Technical Flow */}
      <div className="relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
          {stages.map((st, idx) => (
            <div
              key={st.name}
              className="p-5 rounded-lg bg-[#12100e] border border-[#241f1a] hover:border-[#c88d51]/40 transition flex flex-col justify-between group min-h-[260px] shadow-lg relative"
            >
              <div>
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#211b17]">
                  <span className="text-[11px] font-mono text-[#c88d51] font-medium">
                    {st.step}
                  </span>
                  <span className="text-[9px] font-mono text-stone-500 uppercase px-1.5 py-0.5 rounded bg-[#1a1613]">
                    {st.tag}
                  </span>
                </div>

                <h3 className="text-sm font-medium text-white font-mono uppercase tracking-tight mb-2 group-hover:text-[#c88d51] transition">
                  {st.name}
                </h3>
                <h4 className="text-xs text-stone-300 font-medium mb-2 leading-snug">
                  {st.title}
                </h4>
                <p className="text-[11px] text-stone-400 font-light leading-relaxed">
                  {st.description}
                </p>
              </div>

              <div className="pt-3 border-t border-[#1f1a16] text-[10px] font-mono text-stone-600 flex items-center justify-between">
                <span>Stage {st.step}</span>
                {idx < stages.length - 1 ? (
                  <span className="text-stone-500">→</span>
                ) : (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
