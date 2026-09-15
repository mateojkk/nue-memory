'use client';

import React, { useState } from 'react';
import { Key, Copy, Check, Plus, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export function ApiKeysView() {
  const [keys, setKeys] = useState([
    {
      id: 'key-live-1',
      name: 'Default Agent Key',
      key: 'nue_live_9f8a2c4e1b7d5a3f0e8b2d6c4a1f',
      createdAt: '2026-09-13',
      lastUsed: 'Just now',
    },
  ]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const handleCopy = (k: string) => {
    navigator.clipboard.writeText(k);
    setCopiedKey(k);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleGenerate = () => {
    const randomHex = Array.from({ length: 28 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const newKey = {
      id: `key-live-${Date.now()}`,
      name: `Agent Key ${keys.length + 1}`,
      key: `nue_live_${randomHex}`,
      createdAt: new Date().toISOString().split('T')[0],
      lastUsed: 'Never',
    };
    setKeys([...keys, newKey]);
  };

  return (
    <div className="space-y-8 font-light text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border)]">
        <div>
          <div className="text-xs font-mono text-[var(--accent)] uppercase tracking-wider mb-1">
            Authentication
          </div>
          <h2 className="text-2xl sm:text-3xl font-medium text-[var(--fg)] tracking-tight font-sans">
            Developer API Keys
          </h2>
          <p className="text-[var(--fg-muted)] text-xs sm:text-sm mt-1">
            API keys authenticate your agent runtimes with the Nue Memory intelligence engine and Walrus storage.
          </p>
        </div>

        <button
          onClick={handleGenerate}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[var(--accent-deep)] hover:bg-[var(--accent)] text-[#4a2c0e] text-xs font-medium transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Key</span>
        </button>
      </div>

      {/* Key Table */}
      <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden shadow-xl">
        <div className="p-4 bg-[var(--surface-2)] border-b border-[var(--border)] flex items-center justify-between text-xs font-mono text-[var(--fg-muted)]">
          <span>ACTIVE API KEYS</span>
          <button
            onClick={() => setRevealed(!revealed)}
            className="flex items-center gap-1 text-[var(--accent)] hover:text-[var(--fg)] transition"
          >
            {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{revealed ? 'Hide Keys' : 'Reveal Keys'}</span>
          </button>
        </div>

        <div className="divide-y divide-[var(--border)]">
          {keys.map((k) => (
            <div key={k.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs">
              <div className="space-y-1">
                <div className="text-[var(--fg)] font-medium flex items-center gap-2">
                  <Key className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>{k.name}</span>
                </div>
                <div className="text-[var(--fg-muted)] text-[11px]">
                  {revealed ? k.key : `${k.key.slice(0, 12)}••••••••••••••••`}
                </div>
              </div>

              <div className="flex items-center gap-4 text-[var(--fg-faint)] text-[11px]">
                <span>Created: {k.createdAt}</span>
                <span>Last used: {k.lastUsed}</span>
                <button
                  onClick={() => handleCopy(k.key)}
                  className="p-1.5 rounded hover:bg-[var(--border)] text-[var(--fg-soft)] hover:text-[var(--fg)] transition"
                  title="Copy Key"
                >
                  {copiedKey === k.key ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
