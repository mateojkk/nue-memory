'use client';

import React, { useState } from 'react';
import { Code2, Copy, Check, Terminal, ExternalLink } from 'lucide-react';

export function DocsView() {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopy = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const methods = [
    {
      name: 'add()',
      signature: 'client.add(messages, user_id="123", options={})',
      description: 'Ingests agent conversation turns or feedback. Nue parses the text, isolates persistent preferences from temporary commands, and persists structured objects to Walrus.',
      python: `from nue import MemoryClient

client = MemoryClient(api_key="...")

# Add interaction turns — Nue extracts what matters & ignores temporary noise
result = client.add(
    messages=[
        {"role": "user", "content": "Make this intro faster, and keep all captions large."}
    ],
    user_id="agent_123"
)
print(result.extracted_memories)`,
    },
    {
      name: 'search()',
      signature: 'client.search(query, filters={"user_id": "123"})',
      description: 'Queries relevant memory context for any incoming agent task or prompt construction. Returns ranked, non-conflicting active memories.',
      python: `# Query memory for prompt construction
memories = client.search(
    query="What are this user's creative preferences?",
    filters={"user_id": "agent_123"}
)
for mem in memories:
    print(f"✓ {mem.category}: {mem.value}")`,
    },
    {
      name: 'get()',
      signature: 'client.get(memory_id)',
      description: 'Fetches the full structured memory record, including confidence scores, origin attribution, and supersession links.',
      python: `# Retrieve single record by ID
record = client.get("mem_8f2a1b")
print(record.source_event)
print(record.memwal_blob_id)`,
    },
    {
      name: 'update()',
      signature: 'client.update(memory_id, updates)',
      description: 'Explicitly alters or refines memory attributes such as strength, category, or scope.',
      python: `# Update memory strength or scope
client.update("mem_8f2a1b", {"strength": "high", "scope": "global"})`,
    },
    {
      name: 'delete()',
      signature: 'client.delete(memory_id)',
      description: 'Permanently removes a memory record from active retrieval and marks it forgotten in decentralized storage.',
      python: `# Remove memory
client.delete("mem_8f2a1b")`,
    },
  ];

  return (
    <div className="space-y-10 font-light text-left">
      <div className="pb-6 border-b border-[#241f1a]">
        <div className="text-xs font-mono text-[#c88d51] uppercase tracking-wider mb-1">
          Developer Reference
        </div>
        <h2 className="text-2xl sm:text-3xl font-medium text-white tracking-tight font-sans">
          Nue Memory SDK API
        </h2>
        <p className="text-stone-400 text-xs sm:text-sm mt-1">
          Simple, drop-in agent memory primitives designed to work with any agent framework (LangChain, LlamaIndex, CrewAI, AutoGen, Livepeer).
        </p>
      </div>

      {/* Installation Block */}
      <div className="p-6 rounded-xl bg-[#141210] border border-[#26211d] space-y-3">
        <span className="text-xs font-mono text-stone-400 uppercase tracking-wider block">
          Installation
        </span>
        <div className="flex items-center justify-between p-3 rounded-md bg-[#0f0e0c] border border-[#241f1a] font-mono text-xs text-stone-200">
          <span>pip install nue-ai</span>
          <button
            onClick={() => handleCopy('pip', 'pip install nue-ai')}
            className="p-1 text-stone-400 hover:text-white transition"
          >
            {copiedSection === 'pip' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Method Reference */}
      <div className="space-y-8">
        {methods.map((m) => (
          <div key={m.name} className="p-6 rounded-xl bg-[#141210] border border-[#26211d] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#211b17]">
              <div className="flex items-center gap-2 font-mono text-sm">
                <span className="text-[#c88d51] font-medium">{m.name}</span>
                <span className="text-stone-500 text-xs hidden sm:inline">{m.signature}</span>
              </div>
              <button
                onClick={() => handleCopy(m.name, m.python)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1f1a16] hover:bg-[#28211b] text-stone-300 text-xs font-mono border border-[#30261f] transition"
              >
                {copiedSection === m.name ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-stone-400" />
                    <span>Copy Snippet</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-stone-400 leading-relaxed font-light font-sans">
              {m.description}
            </p>

            <div className="p-4 rounded-md bg-[#0f0e0c] border border-[#241f1a] font-mono text-xs text-stone-300 overflow-x-auto leading-relaxed">
              <pre>{m.python}</pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
