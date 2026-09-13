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
    <footer className="px-6 py-16 bg-[#0a0908] border-t border-[#1f1a16] text-xs text-stone-400 font-light">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 mb-12 text-left">
        {/* Brand Column */}
        <div className="space-y-3">
          <NueLogo size={24} showText={true} textSize="text-lg" />
          <p className="text-stone-400 text-xs leading-relaxed font-light">
            The memory infrastructure layer for AI agents.
          </p>
          <div className="pt-1">
            <span className="text-[11px] font-mono text-[#c88d51] bg-[#1a1512] px-2.5 py-1 rounded border border-[#2e241c]">
              Founded by NextMathLabs
            </span>
          </div>
        </div>

        {/* Product Column */}
        <div>
          <h4 className="font-medium text-white mb-3 uppercase tracking-wider text-[11px] font-mono">
            Product
          </h4>
          <ul className="space-y-2 text-stone-400 font-light">
            <li>
              <a href="#product" className="hover:text-white transition">
                Nue Memory
              </a>
            </li>
            <li>
              <button
                onClick={onOpenWorkspace}
                className="hover:text-white transition text-left"
              >
                Media Memory
              </button>
            </li>
            <li>
              <a href="#product" className="hover:text-white transition">
                Differentiator Engine
              </a>
            </li>
            <li>
              <a href="#developers" className="hover:text-white transition">
                Memory Evolution
              </a>
            </li>
          </ul>
        </div>

        {/* Infrastructure Column */}
        <div>
          <h4 className="font-medium text-white mb-3 uppercase tracking-wider text-[11px] font-mono">
            Infrastructure
          </h4>
          <ul className="space-y-2 text-stone-400 font-light">
            <li>
              <a
                href="https://walrus.xyz"
                target="_blank"
                rel="noreferrer"
                className="hover:text-white transition inline-flex items-center gap-1"
              >
                <span>Walrus</span>
                <ExternalLink className="w-3 h-3 text-stone-500" />
              </a>
            </li>
            <li>
              <a
                href="https://memory.walrus.xyz"
                target="_blank"
                rel="noreferrer"
                className="hover:text-white transition inline-flex items-center gap-1"
              >
                <span>MemWal</span>
                <ExternalLink className="w-3 h-3 text-stone-500" />
              </a>
            </li>
            <li>
              <a
                href="https://agent.livepeer.org"
                target="_blank"
                rel="noreferrer"
                className="hover:text-white transition inline-flex items-center gap-1"
              >
                <span>Livepeer Agent</span>
                <ExternalLink className="w-3 h-3 text-stone-500" />
              </a>
            </li>
          </ul>
        </div>

        {/* Developers & Hackathon */}
        <div>
          <h4 className="font-medium text-white mb-3 uppercase tracking-wider text-[11px] font-mono">
            Developers
          </h4>
          <ul className="space-y-2 text-stone-400 font-light mb-5">
            <li>
              <button onClick={onOpenDocs} className="hover:text-white transition text-left">
                Documentation
              </button>
            </li>
            <li>
              <a
                href="https://github.com/NextMathLabs"
                target="_blank"
                rel="noreferrer"
                className="hover:text-white transition inline-flex items-center gap-1"
              >
                <span>GitHub</span>
                <ExternalLink className="w-3 h-3 text-stone-500" />
              </a>
            </li>
            <li>
              <a href="#developers" className="hover:text-white transition">
                SDK (pip install nue-ai)
              </a>
            </li>
          </ul>

          <h4 className="font-medium text-white mb-2 uppercase tracking-wider text-[11px] font-mono">
            Hackathon
          </h4>
          <div className="text-stone-400 text-xs font-light">
            Livepeer Agent Hackathon 2026
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-6 border-t border-[#1a1714] flex flex-col sm:flex-row items-center justify-between text-[11px] text-stone-500 gap-4">
        <div>
          &copy; 2026 Nue &middot; Founded by NextMathLabs. All rights reserved.
        </div>
        <div className="flex items-center gap-4 text-stone-400 font-mono text-[10px]">
          <span>WALRUS MEMWAL</span>
          <span>&middot;</span>
          <span>LIVEPEER AGENT MCP</span>
        </div>
      </div>
    </footer>
  );
}
