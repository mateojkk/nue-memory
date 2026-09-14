'use client';

import React, { useState } from 'react';
import { Copy, Check, ArrowRight, Code2 } from 'lucide-react';
import { Reveal } from '@/components/motion';

export function QuickstartSection() {
  const [copiedPip, setCopiedPip] = useState(false);
  const [activeTab, setActiveTab] = useState<'python' | 'node'>('python');

  const handleCopyPip = () => {
    navigator.clipboard.writeText('pip install nue-ai');
    setCopiedPip(true);
    setTimeout(() => setCopiedPip(false), 2000);
  };

  return (
    <section id="developers" className="py-24 px-4 max-w-7xl mx-auto border-t border-[var(--border)] font-light">
      <Reveal>
        <div className="text-left mb-12">
        <div className="text-xs font-mono text-[var(--fg-muted)] uppercase tracking-wider mb-2">
          Developer Quickstart
        </div>
        <h2 className="text-3xl sm:text-4xl font-medium text-[var(--fg)] tracking-tight font-sans">
          Give your agents memory in minutes.
        </h2>
        <p className="text-[var(--fg-muted)] text-sm sm:text-base mt-2 max-w-2xl font-light">
          Drop-in memory infrastructure for any agent framework.
        </p>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Code Window */}
        <div className="lg:col-span-7 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-xl overflow-hidden">
          {/* Header Bar */}
          <div className="px-5 py-3 bg-[var(--surface-2)] border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--border)]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--border)]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--border)]" />
              <span className="ml-2 text-xs font-mono text-[var(--fg-soft)]">
                {activeTab === 'python' ? 'quickstart.py' : 'quickstart.ts'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex bg-[var(--surface-2)] p-0.5 rounded border border-[var(--border)] text-[11px] font-mono">
                <button
                  onClick={() => setActiveTab('python')}
                  className={`px-2 py-0.5 rounded-sm transition ${
                    activeTab === 'python' ? 'bg-[var(--border)] text-[var(--fg)] font-medium' : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
                  }`}
                >
                  Python
                </button>
                <button
                  onClick={() => setActiveTab('node')}
                  className={`px-2 py-0.5 rounded-sm transition ${
                    activeTab === 'node' ? 'bg-[var(--border)] text-[var(--fg)] font-medium' : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
                  }`}
                >
                  TypeScript
                </button>
              </div>
            </div>
          </div>

          {/* Code Content */}
          <div className="p-6 font-mono text-xs leading-relaxed text-[var(--fg-soft)] overflow-x-auto bg-[var(--surface)]">
            {activeTab === 'python' ? (
              <pre className="space-y-1">
                <div><span className="text-[var(--fg-muted)]">from</span> nue <span className="text-[var(--fg-muted)]">import</span> MemoryClient</div>
                <div className="text-transparent">_</div>
                <div>client = MemoryClient(api_key=<span className="text-[var(--accent-deep)]">&quot;...&quot;</span>)</div>
                <div className="text-transparent">_</div>
                <div>client.add(</div>
                <div>    [</div>
                <div>        &#123;</div>
                <div>            <span className="text-[var(--accent-deep)]">&quot;role&quot;</span>: <span className="text-[var(--accent-deep)]">&quot;user&quot;</span>,</div>
                <div>            <span className="text-[var(--accent-deep)]">&quot;content&quot;</span>: <span className="text-emerald-400">&quot;I prefer bright, minimal visual aesthetics.&quot;</span></div>
                <div>        &#125;</div>
                <div>    ],</div>
                <div>    user_id=<span className="text-[var(--accent-deep)]">&quot;agent_123&quot;</span></div>
                <div>)</div>
                <div className="text-transparent">_</div>
                <div>memories = client.search(</div>
                <div>    <span className="text-emerald-400">&quot;What are this user&apos;s visual preferences?&quot;</span>,</div>
                <div>    filters=&#123;<span className="text-[var(--accent-deep)]">&quot;user_id&quot;</span>: <span className="text-[var(--accent-deep)]">&quot;agent_123&quot;</span>&#125;</div>
                <div>)</div>
              </pre>
            ) : (
              <pre className="space-y-1">
                <div><span className="text-[var(--fg-muted)]">import</span> &#123; MemoryClient &#125; <span className="text-[var(--fg-muted)]">from</span> <span className="text-[var(--accent-deep)]">&quot;@nue-memory/sdk&quot;</span>;</div>
                <div className="text-transparent">_</div>
                <div><span className="text-[var(--fg-muted)]">const</span> client = <span className="text-[var(--fg-muted)]">new</span> MemoryClient(&#123; apiKey: process.env.NUE_API_KEY &#125;);</div>
                <div className="text-transparent">_</div>
                <div><span className="text-[var(--fg-muted)]">await</span> client.add([</div>
                <div>  &#123; role: <span className="text-[var(--accent-deep)]">&quot;user&quot;</span>, content: <span className="text-emerald-400">&quot;I prefer bright, minimal visual aesthetics.&quot;</span> &#125;</div>
                <div>], &#123; userId: <span className="text-[var(--accent-deep)]">&quot;agent_123&quot;</span> &#125;);</div>
                <div className="text-transparent">_</div>
                <div><span className="text-[var(--fg-muted)]">const</span> memories = <span className="text-[var(--fg-muted)]">await</span> client.search(</div>
                <div>  <span className="text-emerald-400">&quot;What are this user&apos;s visual preferences?&quot;</span>,</div>
                <div>  &#123; filters: &#123; userId: <span className="text-[var(--accent-deep)]">&quot;agent_123&quot;</span> &#125; &#125;</div>
                <div>);</div>
              </pre>
            )}
          </div>
        </div>

        {/* Right Column: Install Command & Workflow Pipeline */}
        <div className="lg:col-span-5 space-y-6">
          {/* Install SDK Box */}
          <div className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
            <span className="text-xs font-mono uppercase tracking-wider text-[var(--fg-muted)] font-medium block mb-2">
              Install SDK
            </span>
            <div className="flex items-center justify-between p-3 rounded-md bg-[var(--surface)] border border-[var(--border)] font-mono text-xs text-[var(--fg)]">
              <span>pip install nue-ai</span>
              <button
                onClick={handleCopyPip}
                className="p-1 hover:text-[var(--fg)] text-[var(--fg-muted)] transition"
                title="Copy install command"
              >
                {copiedPip ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Simple Workflow Flow */}
          <div className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-4">
            <span className="text-xs font-mono uppercase tracking-wider text-[var(--fg-muted)] font-medium block mb-2">
              Execution Workflow
            </span>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 rounded bg-[var(--surface-2)] border border-[var(--border)] text-[var(--fg-muted)] flex items-center justify-center text-[10px]">
                  1
                </span>
                <span className="text-[var(--fg-soft)]">add memory</span>
              </div>
              <div className="w-px h-3 bg-[var(--border)] ml-2.5" />

              <div className="flex items-center gap-3">
                <span className="w-5 h-5 rounded bg-[var(--surface-2)] border border-[var(--border)] text-[var(--fg-muted)] flex items-center justify-center text-[10px]">
                  2
                </span>
                <span className="text-[var(--fg-soft)]">Nue extracts what matters</span>
              </div>
              <div className="w-px h-3 bg-[var(--border)] ml-2.5" />

              <div className="flex items-center gap-3">
                <span className="w-5 h-5 rounded bg-[var(--surface-2)] border border-[var(--border)] text-[var(--fg-muted)] flex items-center justify-center text-[10px]">
                  3
                </span>
                <span className="text-[var(--fg-soft)]">memory persisted</span>
              </div>
              <div className="w-px h-3 bg-[var(--border)] ml-2.5" />

              <div className="flex items-center gap-3">
                <span className="w-5 h-5 rounded bg-[var(--surface-2)] border border-[var(--border)] text-[var(--fg-muted)] flex items-center justify-center text-[10px]">
                  4
                </span>
                <span className="text-[var(--fg-soft)]">search later</span>
              </div>
              <div className="w-px h-3 bg-[var(--border)] ml-2.5" />

              <div className="flex items-center gap-3">
                <span className="w-5 h-5 rounded bg-[var(--surface-2)] border border-[var(--border)] text-[var(--fg-muted)] flex items-center justify-center text-[10px]">
                  5
                </span>
                <span className="text-emerald-400">relevant context returned</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
