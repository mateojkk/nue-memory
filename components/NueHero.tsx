'use client';

import React, { useState } from 'react';
import {
  ArrowRight,
  Copy,
  Check,
  Sparkles,
  Code2,
  Layers,
  Plus,
  Bot,
  Database,
} from 'lucide-react';
import { MediaPreview } from './MediaPreview';
import { AgentChat } from './AgentChat';
import { MemoryConfirmation } from './MemoryConfirmation';
import { CreativeProject, MediaVersion, ChatMessage, MediaPreference } from '@/lib/types';

interface NueHeroProps {
  activeTab: 'sdk' | 'studio' | 'pipeline';
  setActiveTab: (tab: 'sdk' | 'studio' | 'pipeline') => void;
  // Studio state
  activeProject: CreativeProject;
  activeVersion: MediaVersion | null;
  allVersions: MediaVersion[];
  onSelectVersion: (idx: number) => void;
  isGenerating: boolean;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onRegenerate: () => void;
  pendingPreferences: Omit<MediaPreference, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>[];
  onConfirmRemember: () => void;
  onDismissPending: () => void;
  isSavingMemory: boolean;
  onNewProject: () => void;
  activeMemories: MediaPreference[];
  onOpenVault: () => void;
  onOpenInspector: () => void;
}

export function NueHero({
  activeTab,
  setActiveTab,
  activeProject,
  activeVersion,
  allVersions,
  onSelectVersion,
  isGenerating,
  messages,
  onSendMessage,
  onRegenerate,
  pendingPreferences,
  onConfirmRemember,
  onDismissPending,
  isSavingMemory,
  onNewProject,
  activeMemories,
  onOpenVault,
  onOpenInspector,
}: NueHeroProps) {
  const [codeLang, setCodeLang] = useState<'python' | 'node'>('python');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedSetup, setCopiedSetup] = useState(false);

  // Authentic Nue SDK Code reflecting Image 2 layout 1-to-1
  const pythonCode = [
    { line: 1, content: '# Step 1 — Install the SDK (run in your terminal, not in Python):', color: 'text-stone-500' },
    { line: 2, content: '# pip install nue-ai', color: 'text-emerald-700' },
    { line: 3, content: '', color: '' },
    { line: 4, content: '# Step 2 — Save this as nue_quickstart.py and run with: python nue_quickstart.py', color: 'text-stone-500' },
    { line: 5, content: 'import os', color: 'text-blue-600 font-medium' },
    { line: 6, content: 'from nue import MemoryClient', color: 'text-blue-600 font-medium' },
    { line: 7, content: '', color: '' },
    { line: 8, content: '# Set your API key (get one at https://app.nue.ai)', color: 'text-stone-500' },
    { line: 9, content: 'client = MemoryClient(api_key=os.getenv("NUE_API_KEY", "your-api-key-here"))', color: 'text-[#18120e]' },
    { line: 10, content: '', color: '' },
    { line: 11, content: '# Add a memory — Nue extracts what matters & filters temporary edits', color: 'text-stone-500' },
    { line: 12, content: 'messages = [', color: 'text-[#18120e]' },
    { line: 13, content: '    {"role": "user", "content": "I prefer bright, minimal visual aesthetics and strict typing."},', color: 'text-emerald-700' },
    { line: 14, content: '    {"role": "assistant", "content": "Got it! I\'ll remember your design and architectural preferences."}', color: 'text-emerald-700' },
    { line: 15, content: ']', color: 'text-[#18120e]' },
    { line: 16, content: 'client.add(messages, user_id="agent_123")', color: 'text-[#9c4e1f] font-medium' },
    { line: 17, content: '', color: '' },
    { line: 18, content: '# Search memories across sessions', color: 'text-stone-500' },
    { line: 19, content: 'results = client.search(', color: 'text-blue-600 font-medium' },
    { line: 20, content: '    "What are my visual and code preferences?",', color: 'text-red-700' },
    { line: 21, content: '    filters={"user_id": "agent_123"}', color: 'text-[#18120e]' },
    { line: 22, content: ')', color: 'text-[#18120e]' },
    { line: 23, content: 'print(results)', color: 'text-blue-600 font-medium' },
  ];

  const nodeCode = [
    { line: 1, content: '// Step 1 — Install the SDK via npm:', color: 'text-stone-500' },
    { line: 2, content: '// npm install nue-ai', color: 'text-emerald-700' },
    { line: 3, content: '', color: '' },
    { line: 4, content: '// Step 2 — Save this as quickstart.js and run with: node quickstart.js', color: 'text-stone-500' },
    { line: 5, content: 'import { MemoryClient } from "nue-ai";', color: 'text-blue-600 font-medium' },
    { line: 6, content: '', color: '' },
    { line: 7, content: '// Set your API key (get one at https://app.nue.ai)', color: 'text-stone-500' },
    { line: 8, content: 'const client = new MemoryClient({', color: 'text-[#18120e]' },
    { line: 9, content: '  apiKey: process.env.NUE_API_KEY ?? "your-api-key-here"', color: 'text-red-700' },
    { line: 10, content: '});', color: 'text-[#18120e]' },
    { line: 11, content: '', color: '' },
    { line: 12, content: '// Add a memory — Nue extracts what matters & filters temporary edits', color: 'text-stone-500' },
    { line: 13, content: 'const messages = [', color: 'text-[#18120e]' },
    { line: 14, content: '  { role: "user", content: "I prefer bright, minimal visual aesthetics and strict typing." },', color: 'text-emerald-700' },
    { line: 15, content: '  { role: "assistant", content: "Got it! I\'ll remember your design and architectural preferences." }', color: 'text-emerald-700' },
    { line: 16, content: '];', color: 'text-[#18120e]' },
    { line: 17, content: 'await client.add(messages, { userId: "agent_123" });', color: 'text-[#9c4e1f] font-medium' },
    { line: 18, content: '', color: '' },
    { line: 19, content: '// Search memories across sessions', color: 'text-stone-500' },
    { line: 20, content: 'const results = await client.search("What are my visual and code preferences?", {', color: 'text-blue-600 font-medium' },
    { line: 21, content: '  filters: { userId: "agent_123" }', color: 'text-[#18120e]' },
    { line: 22, content: '});', color: 'text-[#18120e]' },
    { line: 23, content: 'console.log(results);', color: 'text-blue-600 font-medium' },
  ];

  const handleCopyCode = () => {
    const raw = (codeLang === 'python' ? pythonCode : nodeCode)
      .map((c) => c.content)
      .join('\n');
    navigator.clipboard.writeText(raw);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopySetup = () => {
    navigator.clipboard.writeText('npm i @nue-memory/sdk @mysten-incubation/memwal');
    setCopiedSetup(true);
    setTimeout(() => setCopiedSetup(false), 2000);
  };

  return (
    <section className="pt-16 pb-20 px-4 max-w-7xl mx-auto text-center relative z-10 font-light">
      {/* Backed by NextMathLabs Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-white border border-[#e5e5e5] text-xs font-medium text-[#18120e] mb-10 shadow-2xs">
        <span>Backed by</span>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#fbf2e9] text-[#9c4e1f] font-medium text-[11px] border border-[#f0e2d3]">
          <span className="w-2 h-2 rounded-full bg-[#c88d51]" />
          NextMathLabs
        </span>
      </div>

      {/* Main Headline: The memory infrastructure layer for AI agents */}
      <h1 className="text-4xl sm:text-6xl md:text-[68px] font-medium tracking-tight text-[#18120e] mb-6 max-w-5xl mx-auto leading-[1.08] font-sans">
        The memory infrastructure layer <br className="hidden sm:inline" />
        for AI agents
      </h1>

      {/* Subtitle: Exactly what Nue offers */}
      <p className="text-base sm:text-lg md:text-[19px] text-[#736357] max-w-3xl mx-auto mb-9 leading-relaxed font-light">
        AI agents can reason, use tools, and complete tasks, but treat every interaction as a new beginning. <br className="hidden sm:inline" />
        Nue gives agents persistent memory to retain what matters, learn from previous interactions, and evolve over time.
      </p>

      {/* Dual Rectangular CTA Buttons (Exact Image 1 layout) */}
      <div className="flex flex-wrap items-center justify-center gap-3.5 mb-12">
        <button
          onClick={() => setActiveTab('studio')}
          className="inline-flex items-center gap-2.5 px-6 py-3 rounded-md bg-[#e8d5c4] hover:bg-[#dec2aa] text-[#1a120c] text-sm font-medium transition shadow-sm border border-[#d6beaa]"
        >
          <span>Get Started</span>
          <ArrowRight className="w-4 h-4 text-[#1a120c]" />
        </button>

        <button
          onClick={handleCopySetup}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-white hover:bg-[#faf8f5] text-[#18120e] text-sm font-medium border border-[#e5e5e5] transition shadow-2xs"
        >
          <span>Setup for Agent</span>
          {copiedSetup ? (
            <Check className="w-4 h-4 text-emerald-600" />
          ) : (
            <Copy className="w-4 h-4 text-stone-500" />
          )}
        </button>
      </div>

      {/* Rectangular Tab Switcher (Exact Image 1 layout) */}
      <div className="inline-flex items-center bg-[#f2eae1] p-1 rounded-md border border-[#e4d7c8] mb-8 text-xs font-medium shadow-2xs">
        <button
          onClick={() => setActiveTab('sdk')}
          className={`flex items-center gap-2 px-4 py-2 rounded-sm transition ${
            activeTab === 'sdk'
              ? 'bg-white text-[#18120e] shadow-sm font-medium'
              : 'text-[#736357] hover:text-[#18120e] font-light'
          }`}
        >
          <Code2 className="w-3.5 h-3.5 text-[#9c4e1f]" />
          <span>SDK Integration</span>
        </button>

        <button
          onClick={() => setActiveTab('studio')}
          className={`flex items-center gap-2 px-4 py-2 rounded-sm transition ${
            activeTab === 'studio'
              ? 'bg-white text-[#18120e] shadow-sm font-medium'
              : 'text-[#736357] hover:text-[#18120e] font-light'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-[#c88d51]" />
          <span>Agent Harness</span>
        </button>

        <button
          onClick={() => setActiveTab('pipeline')}
          className={`flex items-center gap-2 px-4 py-2 rounded-sm transition ${
            activeTab === 'pipeline'
              ? 'bg-white text-[#18120e] shadow-sm font-medium'
              : 'text-[#736357] hover:text-[#18120e] font-light'
          }`}
        >
          <Database className="w-3.5 h-3.5 text-[#b45a27]" />
          <span>Architecture</span>
        </button>
      </div>

      {/* Hero Window Container */}
      <div className="max-w-5xl mx-auto rounded-2xl bg-white border border-[#e5e5e5] shadow-xl shadow-stone-200/50 overflow-hidden text-left">
        {/* Window Top Bar */}
        <div className="px-5 py-3.5 bg-white border-b border-[#f0f0f0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#ff5f56] inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#ffbd2e] inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#27c93f] inline-block" />
          </div>

          {/* Right Language Switcher */}
          {activeTab === 'sdk' ? (
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center bg-[#f5f5f5] p-1 rounded-md text-xs font-mono font-medium text-[#525252]">
                <button
                  onClick={() => setCodeLang('python')}
                  className={`px-3 py-1 rounded-sm flex items-center gap-1.5 transition ${
                    codeLang === 'python'
                      ? 'bg-white text-[#18120e] shadow-2xs font-medium'
                      : 'hover:text-[#18120e]'
                  }`}
                >
                  <span>🐍</span>
                  <span>PYTHON</span>
                </button>
                <button
                  onClick={() => setCodeLang('node')}
                  className={`px-3 py-1 rounded-sm flex items-center gap-1.5 transition ${
                    codeLang === 'node'
                      ? 'bg-white text-[#18120e] shadow-2xs font-medium'
                      : 'hover:text-[#18120e]'
                  }`}
                >
                  <span>🟨</span>
                  <span>NODE.JS</span>
                </button>
              </div>

              <button
                onClick={handleCopyCode}
                className="p-1.5 rounded-md border border-[#e5e5e5] hover:bg-[#faf8f5] text-stone-600 hover:text-black transition"
                title="Copy snippet"
              >
                {copiedCode ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          ) : activeTab === 'studio' ? (
            <div className="flex items-center gap-2">
              <button
                onClick={onNewProject}
                className="px-3 py-1 rounded-md bg-[#fbf2e9] hover:bg-[#f5e6d6] text-[#9c4e1f] text-xs font-mono font-medium flex items-center gap-1 border border-[#f0e2d3] transition"
                title="Simulate cross-session recall"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Session (Demo)</span>
              </button>
              <button
                onClick={onOpenInspector}
                className="px-3 py-1 rounded-md bg-white hover:bg-stone-50 text-[#18120e] text-xs font-mono font-medium flex items-center gap-1 border border-[#e5e5e5] transition"
              >
                <Layers className="w-3.5 h-3.5 text-[#9c4e1f]" />
                <span>Inspect Context</span>
              </button>
            </div>
          ) : (
            <div className="text-xs font-mono text-[#736357] flex items-center gap-2 font-light">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Nue Agent Memory Layer</span>
            </div>
          )}
        </div>

        {/* Window Body Content */}
        <div className="p-5 sm:p-7 bg-[#faf8f5]">
          {/* TAB 1: SDK CODE (Authentic Nue Memory Client) */}
          {activeTab === 'sdk' && (
            <div className="bg-white rounded-xl border border-[#ededed] p-5 font-mono text-[13px] leading-relaxed overflow-x-auto shadow-2xs">
              <div className="space-y-1 font-light">
                {(codeLang === 'python' ? pythonCode : nodeCode).map((item) => (
                  <div key={item.line} className="flex items-start">
                    <span className="w-8 select-none text-stone-300 text-right pr-4 text-xs font-light">
                      {item.line}
                    </span>
                    <span className={`flex-1 ${item.color} whitespace-pre font-light`}>
                      {item.content}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: INTERACTIVE STUDIO (Live demonstration of Media Memory built on Nue) */}
          {activeTab === 'studio' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[580px]">
              {/* Left Column: Video Preview Player (7 cols) */}
              <div className="lg:col-span-7 flex flex-col">
                <MediaPreview
                  version={activeVersion}
                  allVersions={allVersions}
                  selectedVersionIndex={activeProject.currentVersionIndex}
                  isLoading={isGenerating}
                  onSelectVersion={onSelectVersion}
                />
              </div>

              {/* Right Column: Agent Chat & Memory Loop (5 cols) */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                {pendingPreferences.length > 0 && (
                  <MemoryConfirmation
                    detectedPreferences={pendingPreferences}
                    onConfirmRemember={onConfirmRemember}
                    onDismiss={onDismissPending}
                    isSaving={isSavingMemory}
                  />
                )}

                <div className="flex-1 flex flex-col">
                  <AgentChat
                    messages={messages}
                    onSendMessage={onSendMessage}
                    onRegenerate={onRegenerate}
                    isLoading={isGenerating}
                    suggestions={
                      allVersions.length === 0
                        ? [
                            'Create a 20-second product promo for my new app.',
                            'Create an energetic social clip for fitness apparel.',
                          ]
                        : [
                            'The intro is too slow. Make the captions larger and remove background music.',
                            'Make the intro smoother and switch to a cinematic visual theme.',
                          ]
                    }
                    onSelectSuggestion={(sug) => onSendMessage(sug)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ARCHITECTURE PIPELINE */}
          {activeTab === 'pipeline' && (
            <div className="max-w-4xl mx-auto py-6 px-4 space-y-8">
              <div className="rounded-xl bg-white border border-[#e5e5e5] p-6 shadow-sm">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#9c4e1f] font-medium block mb-2">
                  Memory Infrastructure Layer
                </span>
                <h3 className="text-xl font-medium text-[#18120e] mb-4">
                  Nue sits between an AI agent and its long-term memory
                </h3>
                <div className="p-5 rounded-lg bg-[#14110f] border border-stone-800 text-stone-300 font-mono text-xs sm:text-sm leading-relaxed overflow-x-auto text-center font-light">
                  <pre className="inline-block text-left">
{`                    AI AGENT
                       │
                       ▼
                  ┌─────────┐
                  │   NUE   │
                  │         │
                  │ remember│
                  │ retrieve│
                  │ evolve  │
                  └────┬────┘
                       │
                       ▼
                    WALRUS`}
                  </pre>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-sans text-left">
                <div className="p-5 rounded-lg bg-white border border-[#e5e5e5] shadow-2xs">
                  <div className="w-7 h-7 rounded-md bg-[#fbf2e9] text-[#9c4e1f] flex items-center justify-center text-xs font-medium mb-3">
                    01
                  </div>
                  <h4 className="text-sm font-medium text-[#18120e] mb-1">Extract What Matters</h4>
                  <p className="text-xs text-stone-500 font-light leading-relaxed">
                    Nue distinguishes temporary instructions (&quot;make this image brighter&quot;) from persistent preferences (&quot;I prefer bright, minimal visuals&quot;).
                  </p>
                </div>

                <div className="p-5 rounded-lg bg-white border border-[#e5e5e5] shadow-2xs">
                  <div className="w-7 h-7 rounded-md bg-[#fbf2e9] text-[#9c4e1f] flex items-center justify-center text-xs font-medium mb-3">
                    02
                  </div>
                  <h4 className="text-sm font-medium text-[#18120e] mb-1">Durable Walrus Storage</h4>
                  <p className="text-xs text-stone-500 font-light leading-relaxed">
                    Nue handles structuring and lifecycle, while Walrus provides decentralized cryptographic persistence independent of any single model.
                  </p>
                </div>

                <div className="p-5 rounded-lg bg-white border border-[#e5e5e5] shadow-2xs">
                  <div className="w-7 h-7 rounded-md bg-[#fbf2e9] text-[#9c4e1f] flex items-center justify-center text-xs font-medium mb-3">
                    03
                  </div>
                  <h4 className="text-sm font-medium text-[#18120e] mb-1">Evolve Over Time</h4>
                  <p className="text-xs text-stone-500 font-light leading-relaxed">
                    Memory is not static. When user preferences change, Nue updates the memory layer instead of accumulating contradictory records indefinitely.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Metric Badge Below Window */}
      <div className="mt-14 flex flex-col items-center justify-center">
        <div className="px-5 py-2 rounded-md bg-[#18120e] text-white font-mono text-xl sm:text-2xl font-medium tracking-tight shadow-md inline-block mb-3">
          160,000+
        </div>
        <p className="text-sm font-medium text-[#525252]">
          Developers build with Nue
        </p>
      </div>
    </section>
  );
}
