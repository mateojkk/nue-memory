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
          <h2 className="text-2xl sm:text-3xl font-medium text-[var(--fg)] tracking-tight font-sans">
            Developer API Keys
          </h2>
          <p className="text-[var(--fg-muted)] text-xs sm:text-sm mt-1">
            API keys to authenticate and connect your external agents to Nue.
          </p>
        </div>

        <button
          onClick={handleGenerate}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--accent-deep)] hover:bg-[var(--accent)] text-[#4a2c0e] text-xs font-medium hover:scale-105 active:scale-95 transition-all duration-200 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Key</span>
        </button>
      </div>

      {/* Key Table */}
      <div className="interactive-card rounded-2xl bg-[var(--surface)] border border-[var(--border)]/60 overflow-hidden shadow-xl animate-fadeIn">
        <div className="p-4 bg-[var(--surface-2)]/70 border-b border-[var(--border)]/50 flex items-center justify-between text-xs font-mono text-[var(--fg-muted)]">
          <span>ACTIVE API KEYS</span>
          <button
            onClick={() => setRevealed(!revealed)}
            className="flex items-center gap-1 text-[var(--accent)] hover:text-[var(--fg)] hover:scale-105 active:scale-95 transition-all duration-200"
          >
            {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{revealed ? 'Hide Keys' : 'Reveal Keys'}</span>
          </button>
        </div>

        <div className="divide-y divide-[var(--border)]/40">
          {keys.map((k) => (
            <div key={k.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs hover:bg-[var(--surface-2)]/40 transition-colors duration-200">
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
                  className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--fg-soft)] hover:text-[var(--fg)] hover:scale-110 active:scale-90 transition-all duration-200"
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
