'use client';

import React, { useState } from 'react';
import { Copy, Check, Code2 } from 'lucide-react';

export function SdkShowcase() {
  const [activeTab, setActiveTab] = useState<'typescript' | 'python'>('typescript');
  const [copied, setCopied] = useState(false);

  const tsCode = `import { NueMemory } from '@nue-memory/media-memory';
import { MemWal } from '@mysten-incubation/memwal';
import { LivepeerMediaAgent } from '@livepeer/agent-sdk';

// 1. Initialize decentralized Walrus memory client
const memory = await NueMemory.init({
  storage: 'walrus',
  namespace: 'creative-media-agents',
});

// 2. Creator starts a brand-new project with a generic brief
const brief = "Create a promo for my new clothing brand.";

// 3. Nue Memory autonomously recalls cross-project preferences
const { enrichedBrief, activePreferences } = await memory.recall({ brief });

// 4. Livepeer Agent renders media enriched with creator taste!
const agent = new LivepeerMediaAgent();
const media = await agent.generateMedia({
  brief,
  enrichedBrief,
  appliedPreferences: activePreferences,
});

console.log(\`Generated \${media.visualTheme} with \${activePreferences.length} remembered preferences!\`);`;

  const pyCode = `import os
from nue_memory import NueMemory
from livepeer_agent import LivepeerAgent

# 1. Initialize Walrus MemWal persistent storage
memory = NueMemory.create(
    storage="walrus",
    namespace="creative-media-agents"
)

# 2. Retrieve memories & augment brief with zero prompt reprompting
brief = "Create a promo for my new clothing brand."
context = memory.recall(brief=brief)

# 3. Direct Livepeer Agent with enriched context
agent = LivepeerAgent()
video = agent.create_media(
    prompt=context.enriched_brief,
    preferences=context.active_preferences
)

print(f"Composed video with {len(context.active_preferences)} Walrus preferences!")`;

  const currentCode = activeTab === 'typescript' ? tsCode : pyCode;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="sdk" className="py-24 px-4 max-w-7xl mx-auto border-t border-[var(--surface-2)]">
      <div className="text-center max-w-3xl mx-auto mb-14">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[var(--surface)] border border-[var(--surface-2)] text-[var(--accent-deep)] text-xs font-mono font-semibold mb-4">
          <Code2 className="w-3.5 h-3.5" />
          <span>Developer SDK</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[var(--surface)] mb-4">
          Simple, drop-in integration{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-deep)] via-[var(--accent)] to-[var(--accent-deep)]">
            in 4 lines of code
          </span>
        </h2>
        <p className="text-sm sm:text-base text-[var(--fg-muted)] leading-relaxed">
          Connect your Livepeer Agent workflows to Walrus MemWal with native TypeScript and Python libraries.
        </p>
      </div>

      <div className="max-w-4xl mx-auto rounded-2xl bg-[var(--border)] border border-[var(--border)] overflow-hidden shadow-xl">
        {/* Tab bar header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[var(--border)] border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 mr-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent-deep)]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent-deep)]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent-deep)]" />
            </div>
            <div className="flex bg-[var(--border)] p-1 rounded-lg border border-[var(--border)]">
              <button
                onClick={() => setActiveTab('typescript')}
                className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition ${
                  activeTab === 'typescript'
                    ? 'bg-[var(--border)] text-[var(--surface)] border border-[var(--accent)]/40 shadow-sm'
                    : 'text-[var(--fg-faint)] hover:text-[var(--fg)]'
                }`}
              >
                TypeScript / Node.js
              </button>
              <button
                onClick={() => setActiveTab('python')}
                className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition ${
                  activeTab === 'python'
                    ? 'bg-[var(--border)] text-[var(--surface)] border border-[var(--accent)]/40 shadow-sm'
                    : 'text-[var(--fg-faint)] hover:text-[var(--fg)]'
                }`}
              >
                Python SDK
              </button>
            </div>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--border)] hover:bg-[var(--accent-deep)] border border-[var(--accent)]/30 text-xs font-mono text-[var(--accent-bright)] transition"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[var(--accent-bright)]" />
                <span className="text-[var(--accent-bright)]">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Code body */}
        <div className="p-6 bg-[var(--border)] overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed">
          <pre className="text-[var(--accent-bright)]">
            <code>
              {currentCode.split('\n').map((line, i) => {
                let formatted = line;
                const isComment = line.trim().startsWith('//') || line.trim().startsWith('#');
                const isKeyword = line.includes('import') || line.includes('from') || line.includes('const') || line.includes('await') || line.includes('new');
                
                return (
                  <div key={i} className="table-row">
                    <span className="table-cell pr-6 text-right select-none text-[var(--accent-deep)] w-8">
                      {i + 1}
                    </span>
                    <span
                      className={`table-cell ${
                        isComment
                          ? 'text-[var(--fg-muted)]'
                          : isKeyword
                          ? 'text-[var(--accent-bright)]'
                          : 'text-[var(--surface)]'
                      }`}
                    >
                      {formatted}
                    </span>
                  </div>
                );
              })}
            </code>
          </pre>
        </div>
      </div>
    </section>
  );
}
