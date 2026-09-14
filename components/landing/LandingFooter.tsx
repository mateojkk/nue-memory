'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';

import { NueLogo } from '../NueLogo';

interface LandingFooterProps {
  onOpenWorkspace?: () => void;
  onOpenDocs?: () => void;
}

export function LandingFooter({ onOpenWorkspace, onOpenDocs }: LandingFooterProps) {
  return (
    <footer className="px-6 py-16 bg-[var(--surface-2)] border-t border-[var(--surface-2)] text-xs text-[var(--fg-muted)] font-light">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 mb-12 text-left">
        {/* Brand Column */}
        <div className="space-y-3">
          <NueLogo size={24} showText={true} textSize="text-lg" />
          <p className="text-[var(--fg-muted)] text-xs leading-relaxed font-light">
            The memory infrastructure layer for AI agents.
          </p>
          <div className="pt-1">
            <span className="text-[11px] font-mono text-[var(--fg-muted)] bg-[var(--border)] px-2.5 py-1 rounded border border-[var(--border)]">
              Founded by NextMathLabs
            </span>
          </div>
        </div>

        {/* Product Column */}
        <div>
          <h4 className="font-medium text-[var(--fg)] mb-3 uppercase tracking-wider text-[11px] font-mono">
            Product
          </h4>
          <ul className="space-y-2 text-[var(--fg-muted)] font-light">
            <li>
              <a href="#product" className="hover:text-[var(--fg)] transition">
                Nue Memory
              </a>
            </li>
            <li>
              <button
                onClick={onOpenWorkspace}
                className="hover:text-[var(--fg)] transition text-left"
              >
                Media Memory
              </button>
            </li>
            <li>
              <a href="#product" className="hover:text-[var(--fg)] transition">
                Differentiator Engine
              </a>
            </li>
            <li>
              <a href="#developers" className="hover:text-[var(--fg)] transition">
                Memory Evolution
              </a>
            </li>
          </ul>
        </div>

        {/* Infrastructure Column: one understated tech mention */}
        <div>
          <h4 className="font-medium text-[var(--fg)] mb-3 uppercase tracking-wider text-[11px] font-mono">
            Under the Hood
          </h4>
          <p className="text-[var(--fg-faint)] font-light text-xs leading-relaxed">
            Durable storage by <a href="https://walrus.xyz" target="_blank" rel="noreferrer" className="hover:text-[var(--fg)] transition underline underline-offset-2">Walrus</a> · media execution by <a href="https://agent.livepeer.org" target="_blank" rel="noreferrer" className="hover:text-[var(--fg)] transition underline underline-offset-2">Livepeer Agent</a>.
          </p>
        </div>

        {/* Developers & Hackathon */}
        <div>
          <h4 className="font-medium text-[var(--fg)] mb-3 uppercase tracking-wider text-[11px] font-mono">
            Developers
          </h4>
          <ul className="space-y-2 text-[var(--fg-muted)] font-light mb-5">
            <li>
              <button onClick={onOpenDocs} className="hover:text-[var(--fg)] transition text-left">
                Documentation
              </button>
            </li>
            <li>
              <a
                href="https://github.com/NextMathLabs"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[var(--fg)] transition inline-flex items-center gap-1"
              >
                <span>GitHub</span>
                <ExternalLink className="w-3 h-3 text-[var(--fg-faint)]" />
              </a>
            </li>
            <li>
              <a href="#developers" className="hover:text-[var(--fg)] transition">
                SDK (pip install nue-ai)
              </a>
            </li>
          </ul>

          <h4 className="font-medium text-[var(--fg)] mb-2 uppercase tracking-wider text-[11px] font-mono">
            Hackathon
          </h4>
          <div className="text-[var(--fg-muted)] text-xs font-light">
            Livepeer Agent Hackathon 2026
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-6 border-t border-[var(--surface-2)] flex flex-col sm:flex-row items-center justify-between text-[11px] text-[var(--fg-faint)] gap-4">
        <div>
          &copy; 2026 Nue &middot; Founded by NextMathLabs. All rights reserved.
        </div>
        <div className="flex items-center gap-4 text-[var(--fg-faint)] font-mono text-[10px]">
          <span>BUILT FOR AGENTS WITH MEMORY</span>
        </div>
      </div>
    </footer>
  );
}
