'use client';

import React, { useState } from 'react';
import { Copy, Check, ArrowRight, Code2 } from 'lucide-react';

export function QuickstartSection() {
  const [copiedPip, setCopiedPip] = useState(false);
  const [activeTab, setActiveTab] = useState<'python' | 'node'>('python');

  const handleCopyPip = () => {
    navigator.clipboard.writeText('pip install nue-ai');
    setCopiedPip(true);
    setTimeout(() => setCopiedPip(false), 2000);
  };

  return (
    <section id="developers" className="py-24 px-4 max-w-7xl mx-auto border-t border-[#211b17] font-light">
      <div className="text-left mb-12">
        <div className="text-xs font-mono text-[#c88d51] uppercase tracking-wider mb-2">
          Developer Quickstart
        </div>
        <h2 className="text-3xl sm:text-4xl font-medium text-white tracking-tight font-sans">
          Give your agents memory in minutes.
        </h2>
        <p className="text-stone-400 text-sm sm:text-base mt-2 max-w-2xl font-light">
          A drop-in memory infrastructure layer designed for any existing AI agent or framework without rebuilding your pipeline.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Code Window */}
        <div className="lg:col-span-7 rounded-xl bg-[#12100e] border border-[#26211d] shadow-xl overflow-hidden">
          {/* Header Bar */}
          <div className="px-5 py-3 bg-[#171411] border-b border-[#241f1a] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3d332c]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#3d332c]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#3d332c]" />
              <span className="ml-2 text-xs font-mono text-stone-300">
                {activeTab === 'python' ? 'quickstart.py' : 'quickstart.ts'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex bg-[#1f1a16] p-0.5 rounded border border-[#2d2621] text-[11px] font-mono">
                <button
                  onClick={() => setActiveTab('python')}
                  className={`px-2 py-0.5 rounded-sm transition ${
                    activeTab === 'python' ? 'bg-[#2b241e] text-white font-medium' : 'text-stone-400 hover:text-white'
                  }`}
                >
                  Python
                </button>
                <button
                  onClick={() => setActiveTab('node')}
                  className={`px-2 py-0.5 rounded-sm transition ${
                    activeTab === 'node' ? 'bg-[#2b241e] text-white font-medium' : 'text-stone-400 hover:text-white'
                  }`}
                >
                  TypeScript
                </button>
              </div>
            </div>
          </div>

          {/* Code Content */}
          <div className="p-6 font-mono text-xs leading-relaxed text-stone-300 overflow-x-auto bg-[#0f0e0c]">
            {activeTab === 'python' ? (
              <pre className="space-y-1">
                <div><span className="text-[#c88d51]">from</span> nue <span className="text-[#c88d51]">import</span> MemoryClient</div>
                <div className="text-transparent">_</div>
                <div>client = MemoryClient(api_key=<span className="text-amber-200">&quot;...&quot;</span>)</div>
                <div className="text-transparent">_</div>
                <div>client.add(</div>
                <div>    [</div>
                <div>        &#123;</div>
                <div>            <span className="text-amber-200">&quot;role&quot;</span>: <span className="text-amber-200">&quot;user&quot;</span>,</div>
                <div>            <span className="text-amber-200">&quot;content&quot;</span>: <span className="text-emerald-400">&quot;I prefer bright, minimal visual aesthetics.&quot;</span></div>
                <div>        &#125;</div>
                <div>    ],</div>
                <div>    user_id=<span className="text-amber-200">&quot;agent_123&quot;</span></div>
                <div>)</div>
                <div className="text-transparent">_</div>
                <div>memories = client.search(</div>
                <div>    <span className="text-emerald-400">&quot;What are this user&apos;s visual preferences?&quot;</span>,</div>
                <div>    filters=&#123;<span className="text-amber-200">&quot;user_id&quot;</span>: <span className="text-amber-200">&quot;agent_123&quot;</span>&#125;</div>
                <div>)</div>
              </pre>
            ) : (
              <pre className="space-y-1">
                <div><span className="text-[#c88d51]">import</span> &#123; MemoryClient &#125; <span className="text-[#c88d51]">from</span> <span className="text-amber-200">&quot;@nue-memory/sdk&quot;</span>;</div>
                <div className="text-transparent">_</div>
                <div><span className="text-[#c88d51]">const</span> client = <span className="text-[#c88d51]">new</span> MemoryClient(&#123; apiKey: process.env.NUE_API_KEY &#125;);</div>
                <div className="text-transparent">_</div>
                <div><span className="text-[#c88d51]">await</span> client.add([</div>
                <div>  &#123; role: <span className="text-amber-200">&quot;user&quot;</span>, content: <span className="text-emerald-400">&quot;I prefer bright, minimal visual aesthetics.&quot;</span> &#125;</div>
                <div>], &#123; userId: <span className="text-amber-200">&quot;agent_123&quot;</span> &#125;);</div>
                <div className="text-transparent">_</div>
                <div><span className="text-[#c88d51]">const</span> memories = <span className="text-[#c88d51]">await</span> client.search(</div>
                <div>  <span className="text-emerald-400">&quot;What are this user&apos;s visual preferences?&quot;</span>,</div>
                <div>  &#123; filters: &#123; userId: <span className="text-amber-200">&quot;agent_123&quot;</span> &#125; &#125;</div>
                <div>);</div>
              </pre>
            )}
          </div>
        </div>

        {/* Right Column: Install Command & Workflow Pipeline */}
        <div className="lg:col-span-5 space-y-6">
          {/* Install SDK Box */}
          <div className="p-5 rounded-xl bg-[#12100e] border border-[#26211d]">
            <span className="text-xs font-mono uppercase tracking-wider text-stone-400 font-medium block mb-2">
              Install SDK
            </span>
            <div className="flex items-center justify-between p-3 rounded-md bg-[#0f0e0c] border border-[#241f1a] font-mono text-xs text-stone-200">
              <span>pip install nue-ai</span>
              <button
                onClick={handleCopyPip}
                className="p-1 hover:text-white text-stone-400 transition"
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
          <div className="p-5 rounded-xl bg-[#12100e] border border-[#26211d] space-y-4">
            <span className="text-xs font-mono uppercase tracking-wider text-stone-400 font-medium block mb-2">
              Execution Workflow
            </span>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 rounded bg-[#1a1714] border border-[#2e2620] text-[#c88d51] flex items-center justify-center text-[10px]">
                  1
                </span>
                <span className="text-stone-300">add memory</span>
              </div>
              <div className="w-px h-3 bg-[#2f2721] ml-2.5" />

              <div className="flex items-center gap-3">
                <span className="w-5 h-5 rounded bg-[#1a1714] border border-[#2e2620] text-[#c88d51] flex items-center justify-center text-[10px]">
                  2
                </span>
                <span className="text-stone-300">Nue extracts what matters</span>
              </div>
              <div className="w-px h-3 bg-[#2f2721] ml-2.5" />

              <div className="flex items-center gap-3">
                <span className="w-5 h-5 rounded bg-[#1a1714] border border-[#2e2620] text-[#c88d51] flex items-center justify-center text-[10px]">
                  3
                </span>
                <span className="text-stone-300">memory persisted to Walrus</span>
              </div>
              <div className="w-px h-3 bg-[#2f2721] ml-2.5" />

              <div className="flex items-center gap-3">
                <span className="w-5 h-5 rounded bg-[#1a1714] border border-[#2e2620] text-[#c88d51] flex items-center justify-center text-[10px]">
                  4
                </span>
                <span className="text-stone-300">search later</span>
              </div>
              <div className="w-px h-3 bg-[#2f2721] ml-2.5" />

              <div className="flex items-center gap-3">
                <span className="w-5 h-5 rounded bg-[#1a1714] border border-[#2e2620] text-[#c88d51] flex items-center justify-center text-[10px]">
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
