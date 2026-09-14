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
      name: 'getContext()',
      signature: 'client.getContext(query, options={"domain": "media", "limit": 6})',
      description: 'Orchestrates retrieved memories directly into a formatted prompt injection block with confidence scores and category directives for any LLM or Agent.',
      python: `# Retrieve pre-formatted agent prompt block
context = client.getContext(
    query="Create a video promo for our new app",
    options={"domain": "media", "limit": 6}
)
# Inject directly into agent prompt
prompt = f"{user_task}\\n{context.injectedContextBlock}"
print(context.injectedContextBlock)`,
    },
    {
      name: 'evolve()',
      signature: 'client.evolve(old_memory_id, new_memory_data)',
      description: 'Resolves contradictions by deactivating an older memory record and persisting a newer preference with bidirectional supersession audit links.',
      python: `# Explicitly supersede an outdated preference
result = client.evolve(
    old_memory_id="mem_8f2a1b",
    new_memory_data={
        "category": "pacing",
        "value": "Prefer fast, energetic introductions and brisk cut pacing",
        "confidence": 0.95
    }
)
print(f"Deactivated: {result.superseded.id} -> Active: {result.active.id}")`,
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
      <div className="pb-6 border-b border-[var(--border)]">
        <div className="text-xs font-mono text-[var(--accent)] uppercase tracking-wider mb-1">
          Developer Reference
        </div>
        <h2 className="text-2xl sm:text-3xl font-medium text-[var(--fg)] tracking-tight font-sans">
          Nue Memory SDK API
        </h2>
        <p className="text-[var(--fg-muted)] text-xs sm:text-sm mt-1">
          Simple, drop-in agent memory primitives designed to work with any agent framework (LangChain, LlamaIndex, CrewAI, AutoGen, Livepeer).
        </p>
      </div>

      {/* Installation Block */}
      <div className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-3">
        <span className="text-xs font-mono text-[var(--fg-muted)] uppercase tracking-wider block">
          Installation
        </span>
        <div className="flex items-center justify-between p-3 rounded-md bg-[var(--surface)] border border-[var(--border)] font-mono text-xs text-[var(--fg)]">
          <span>pip install nue-ai</span>
          <button
            onClick={() => handleCopy('pip', 'pip install nue-ai')}
            className="p-1 text-[var(--fg-muted)] hover:text-[var(--fg)] transition"
          >
            {copiedSection === 'pip' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Method Reference */}
      <div className="space-y-8">
        {methods.map((m) => (
          <div key={m.name} className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2 font-mono text-sm">
                <span className="text-[var(--accent)] font-medium">{m.name}</span>
                <span className="text-[var(--fg-faint)] text-xs hidden sm:inline">{m.signature}</span>
              </div>
              <button
                onClick={() => handleCopy(m.name, m.python)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--surface-2)] hover:bg-[var(--accent-deep)] text-[var(--fg-soft)] text-xs font-mono border border-[var(--border)] transition"
              >
                {copiedSection === m.name ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-[var(--fg-muted)]" />
                    <span>Copy Snippet</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-[var(--fg-muted)] leading-relaxed font-light font-sans">
              {m.description}
            </p>

            <div className="p-4 rounded-md bg-[var(--surface)] border border-[var(--border)] font-mono text-xs text-[var(--fg-soft)] overflow-x-auto leading-relaxed">
              <pre>{m.python}</pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
