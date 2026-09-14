'use client';

import React, { useState } from 'react';
import { Code2, Check, Copy } from 'lucide-react';

export function MemoryObjectsSection() {
  const [activeCategory, setActiveCategory] = useState<string>('visual_style');
  const [copiedJson, setCopiedJson] = useState(false);

  const categories = [
    { id: 'visual_style', name: 'visual_style', domain: 'Creative' },
    { id: 'pacing', name: 'pacing', domain: 'Creative' },
    { id: 'typography', name: 'typography', domain: 'Creative' },
    { id: 'music', name: 'music', domain: 'Audio' },
    { id: 'voice', name: 'voice', domain: 'Audio' },
    { id: 'captions', name: 'captions', domain: 'Creative' },
    { id: 'color', name: 'color', domain: 'Creative' },
    { id: 'transitions', name: 'transitions', domain: 'Creative' },
    { id: 'aspect_ratio', name: 'aspect_ratio', domain: 'Creative' },
    { id: 'duration', name: 'duration', domain: 'Creative' },
    { id: 'branding', name: 'branding', domain: 'Brand' },
    { id: 'coding_style', name: 'coding_style', domain: 'Engineering' },
    { id: 'tool_preferences', name: 'tool_preferences', domain: 'Engineering' },
    { id: 'workflow_preferences', name: 'workflow_preferences', domain: 'General' },
  ];

  const categoryExamples: Record<string, { value: string; strength: string; scope: string }> = {
    visual_style: { value: 'bright and minimal', strength: 'high', scope: 'media' },
    pacing: { value: 'energetic intro with brisk cut pacing', strength: 'high', scope: 'media' },
    typography: { value: 'large, bold sans-serif with high contrast', strength: 'high', scope: 'media' },
    music: { value: 'avoid dramatic music; prefer modern rhythm beds', strength: 'high', scope: 'media' },
    voice: { value: 'warm, natural conversational pacing without robotic pitch', strength: 'medium', scope: 'media' },
    captions: { value: 'display synchronized word-by-word highlight captions', strength: 'high', scope: 'media' },
    color: { value: 'warm amber undertones with desaturated background', strength: 'medium', scope: 'media' },
    transitions: { value: 'match-cut on motion with zero disorienting zooms', strength: 'high', scope: 'media' },
    aspect_ratio: { value: '16:9 cinematic widescreen by default', strength: 'high', scope: 'media' },
    duration: { value: 'target 15 to 30 seconds for product teasers', strength: 'medium', scope: 'media' },
    branding: { value: 'watermark in top-right with 80% opacity', strength: 'high', scope: 'media' },
    coding_style: { value: 'strict TypeScript, no any, prefer functional components', strength: 'high', scope: 'coding' },
    tool_preferences: { value: 'pnpm for package management, biome for formatting', strength: 'high', scope: 'coding' },
    workflow_preferences: { value: 'always generate executive summary before detailed code', strength: 'high', scope: 'general' },
  };

  const sample = categoryExamples[activeCategory] || categoryExamples['visual_style'];

  const memoryJson = {
    type: 'preference',
    category: activeCategory,
    value: sample.value,
    strength: sample.strength,
    confidence: 0.96,
    source: 'user_feedback',
    scope: sample.scope,
    created_at: '2026-09-13T12:00:00Z',
    updated_at: '2026-09-13T12:00:00Z',
    memwal_blob_id: 'walrus://0x8f2a...c4b1',
  };

  const formattedJson = JSON.stringify(memoryJson, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedJson);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <section className="py-24 px-4 max-w-7xl mx-auto border-t border-[var(--border)] font-light">
      <div className="text-left mb-12">
        <div className="text-xs font-mono text-[var(--fg-muted)] uppercase tracking-wider mb-2">
          Structured Schema
        </div>
        <h2 className="text-3xl sm:text-5xl font-medium text-[var(--fg)] tracking-tight font-sans">
          Domain-Agnostic Memory Objects
        </h2>
        <p className="text-[var(--fg-muted)] text-sm sm:text-base mt-2 max-w-2xl font-light">
          Structured, validated memory objects — not messy chat logs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Category Selector Chips */}
        <div className="lg:col-span-5 space-y-4">
          <span className="text-xs font-mono uppercase tracking-wider text-[var(--fg-muted)] font-medium block">
            Ontology Categories ({categories.length})
          </span>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-mono transition flex items-center gap-1.5 border ${
                  activeCategory === cat.id
                    ? 'bg-[var(--border)] text-[var(--fg-muted)] border-[var(--accent)]/50 shadow-sm'
                    : 'bg-[var(--surface)] text-[var(--fg-muted)] hover:text-[var(--fg)] border-[var(--border)]'
                }`}
              >
                <span>{cat.name}</span>
                <span className="text-[9px] text-[var(--fg-faint)] uppercase">{cat.domain}</span>
              </button>
            ))}
          </div>

          <p className="text-xs text-[var(--fg-muted)] font-light leading-relaxed pt-3 border-t border-[var(--border)]">
            One schema works for media, coding agents, research, and custom ontologies.
          </p>
        </div>

        {/* Right Column: Interactive JSON Viewer */}
        <div className="lg:col-span-7 rounded-xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden">
          <div className="px-5 py-3 bg-[var(--surface-2)] border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="w-3.5 h-3.5 text-[var(--fg-muted)]" />
              <span className="text-xs font-mono text-[var(--fg-soft)]">
                memory_object_{activeCategory}.json
              </span>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--border)] hover:bg-[var(--border)] text-[var(--fg-soft)] text-xs font-mono border border-[var(--border)] transition"
            >
              {copiedJson ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-[var(--fg-muted)]" />
                  <span>Copy JSON</span>
                </>
              )}
            </button>
          </div>

          <div className="p-6 font-mono text-xs leading-relaxed text-[var(--fg-soft)] overflow-x-auto bg-[var(--surface)]">
            <pre className="text-emerald-400">
              <code>{formattedJson}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
