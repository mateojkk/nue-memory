'use client';

import React, { useState } from 'react';
import { X, ArrowRight, Star, ChevronDown, Database } from 'lucide-react';

interface NueNavbarProps {
  onOpenVault: () => void;
  activeCount: number;
}

export function NueNavbar({ onOpenVault, activeCount }: NueNavbarProps) {
  const [showBanner, setShowBanner] = useState(true);

  return (
    <div className="w-full bg-white sticky top-0 z-50 font-light">
      {/* Top Notification Banner (Exact mem0 Image 1 layout) */}
      {showBanner && (
        <div className="bg-[#f5ece4] border-b border-[#e8ded3] px-4 py-2 text-xs text-[#18120e] flex items-center justify-between transition relative">
          <div className="flex-1 flex items-center justify-center gap-2 flex-wrap font-light">
            <span className="font-light text-[13px]">
              Nue now has a way to keep memory accurate as it grows.
            </span>
            <a
              href="#studio"
              className="px-2.5 py-0.5 rounded-md bg-white border border-[#e2d5c5] text-xs font-medium hover:bg-[#faf6f0] transition shadow-2xs inline-flex items-center gap-1 text-[#18120e]"
            >
              <span>Introducing Media Memory!</span>
            </a>
          </div>
          <button
            onClick={() => setShowBanner(false)}
            className="p-1 text-[#786152] hover:text-[#18120e] transition"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Navbar */}
      <header className="border-b border-[#f0f0f0] bg-white px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand Logo: Clean asterisk flower icon + lowercase 'nue' */}
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 flex items-center justify-center text-[#18120e]">
              <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-[#18120e]" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="3" fill="currentColor" />
                <path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
              </svg>
            </div>
            <a href="/" className="text-2xl font-medium tracking-tight text-[#18120e] font-sans">
              nue
            </a>
          </div>

          {/* Desktop Nav Links (Exact mem0 Image 1 categories) */}
          <nav className="hidden lg:flex items-center gap-7 text-[13px] font-medium text-[#18120e] tracking-tight">
            <div className="flex items-center gap-1 cursor-pointer hover:text-[#9c4e1f] transition">
              <span>DEVELOPERS</span>
              <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
            </div>
            <div className="flex items-center gap-1 cursor-pointer hover:text-[#9c4e1f] transition">
              <span>RESOURCES</span>
              <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
            </div>
            <a href="#features" className="hover:text-[#9c4e1f] transition">
              PRICING
            </a>
            <div className="flex items-center gap-1 cursor-pointer hover:text-[#9c4e1f] transition">
              <span>USECASES</span>
              <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
            </div>
            <div className="flex items-center gap-1 cursor-pointer hover:text-[#9c4e1f] transition">
              <span>COMPANY</span>
              <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
            </div>
          </nav>

          {/* Right Controls (Exact mem0 Image 1 layout) */}
          <div className="flex items-center gap-3">
            {/* GitHub Star Pill Badge */}
            <div className="hidden sm:inline-flex items-center rounded-md border border-[#e5e5e5] bg-white text-xs font-medium overflow-hidden shadow-2xs">
              <span className="flex items-center gap-1.5 px-2.5 py-1.5 border-r border-[#e5e5e5] text-[#18120e]">
                <Star className="w-3.5 h-3.5 fill-[#18120e]" />
                <span>Star</span>
              </span>
              <span className="px-2.5 py-1.5 font-mono text-[#525252]">65,214</span>
            </div>

            {/* Walrus Vault Drawer Trigger */}
            <button
              onClick={onOpenVault}
              className="px-3 py-1.5 rounded-md border border-[#e5e5e5] hover:border-[#c88d51] bg-white text-xs font-medium text-[#18120e] flex items-center gap-1.5 transition"
              title="Open Walrus Memory Vault"
            >
              <Database className="w-3.5 h-3.5 text-[#9c4e1f]" />
              <span className="hidden md:inline">Vault</span>
              {activeCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#18120e] text-white text-[9px] font-medium flex items-center justify-center">
                  {activeCount}
                </span>
              )}
            </button>

            {/* Primary Get Started Button (Rectangular) */}
            <a
              href="#studio"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#e8d5c4] hover:bg-[#dec2aa] text-[#1a120c] text-xs font-medium transition shadow-sm border border-[#d6beaa]"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#1a120c]" />
            </a>
          </div>
        </div>
      </header>

    </div>
  );
}
