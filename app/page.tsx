'use client';

import React, { useState, useEffect } from 'react';
import { NueNavbar } from '@/components/NueNavbar';
import { NueHero } from '@/components/NueHero';
import { NueDevelopersSection } from '@/components/NueDevelopersSection';
import { NueHowItWorks } from '@/components/NueHowItWorks';
import { NueDomainsSection } from '@/components/NueDomainsSection';
import { MemoryPanel } from '@/components/MemoryPanel';
import { EnrichedBriefModal } from '@/components/EnrichedBriefModal';
import {
  CreativeProject,
  MediaVersion,
  ChatMessage,
  MediaPreference,
} from '@/lib/types';
import { Sparkles, ExternalLink } from 'lucide-react';

export default function Home() {
  // Hero Tab State: 'sdk' | 'studio' | 'pipeline' (defaults to 'sdk' to match Image 1 & 2)
  const [heroTab, setHeroTab] = useState<'sdk' | 'studio' | 'pipeline'>('sdk');

  // Projects State (Demonstrating Media Memory feature under Nue)
  const [projects, setProjects] = useState<CreativeProject[]>([
    {
      id: 'proj-1',
      title: 'Project A - SaaS App Launch Promo',
      initialPrompt: 'Create a 20-second product promo for my new app.',
      createdAt: new Date().toISOString(),
      currentVersionIndex: 0,
      versions: [],
    },
  ]);
  const [currentProjectIndex, setCurrentProjectIndex] = useState(0);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'agent',
      content:
        'Welcome to Media Studio. I am your Livepeer Agent, powered by Nue persistent memory.\n\nEnter a creative prompt or try one of the suggestions below to start generating.',
      timestamp: new Date().toISOString(),
    },
  ]);

  // Memory & Confirmation State
  const [activeMemories, setActiveMemories] = useState<MediaPreference[]>([]);
  const [pendingPreferences, setPendingPreferences] = useState<
    Omit<MediaPreference, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>[]
  >([]);
  const [isMemoryPanelOpen, setIsMemoryPanelOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  // Loading States
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingMemory, setIsSavingMemory] = useState(false);

  const activeProject = projects[currentProjectIndex];
  const activeVersion =
    activeProject?.versions?.length > 0
      ? activeProject.versions[activeProject.currentVersionIndex]
      : null;

  // Load initial memories from MemWal on Walrus
  useEffect(() => {
    fetchMemories();
  }, []);

  const fetchMemories = async () => {
    try {
      const res = await fetch('/api/memwal');
      const data = await res.json();
      if (data.success && data.preferences) {
        setActiveMemories(data.preferences);
      }
    } catch (e) {
      console.warn('Failed to load memories:', e);
    }
  };

  // Generate Media via Livepeer Agent
  const handleGenerate = async (
    promptText: string,
    versionNumber = 1,
    feedbackContext?: string
  ) => {
    setIsGenerating(true);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: promptText,
          versionNumber,
          projectTitle: activeProject.title,
          feedbackContext,
        }),
      });

      const data = await res.json();
      if (data.success && data.mediaVersion) {
        const newVersion: MediaVersion = data.mediaVersion;

        // Update Project with new Version
        setProjects((prev) => {
          const updated = [...prev];
          const proj = { ...updated[currentProjectIndex] };
          proj.versions = [...proj.versions, newVersion];
          proj.currentVersionIndex = proj.versions.length - 1;
          updated[currentProjectIndex] = proj;
          return updated;
        });

        // Add Agent Response message
        const appliedCount = newVersion.appliedPreferences.length;
        const memoryDetails =
          appliedCount > 0
            ? `\n\n✨ Automatically applied ${appliedCount} remembered preference(s) from Nue Memory.`
            : '';

        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            sender: 'agent',
            content: `I have generated Version ${newVersion.versionNumber} for you with ${newVersion.pacing} pacing, ${newVersion.captionStyle.size} captions, and ${newVersion.audioStyle.style}.${memoryDetails}`,
            timestamp: new Date().toISOString(),
            versionNumber: newVersion.versionNumber,
          },
        ]);
      }
    } catch (err) {
      console.error('Generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle User Message / Feedback
  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // If project has no versions yet, this is the first generation
    if (activeProject.versions.length === 0) {
      await handleGenerate(text, 1);
      return;
    }

    // Otherwise, this is review feedback on the current version
    setIsGenerating(true);

    try {
      // Step 1: Classify feedback and extract preferences via Nue
      const classifyRes = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedback: text,
          projectTitle: activeProject.title,
          currentBrief: activeProject.initialPrompt,
        }),
      });

      const classifyData = await classifyRes.json();

      if (
        classifyData.success &&
        classifyData.classification?.extractedPreferences?.length > 0
      ) {
        setPendingPreferences(classifyData.classification.extractedPreferences);
      }

      // Step 2: Livepeer Agent regenerates revised version with Nue context
      const nextVersionNumber = activeProject.versions.length + 1;
      await handleGenerate(
        activeProject.initialPrompt,
        nextVersionNumber,
        text
      );
    } catch (e) {
      console.error('Feedback handling error:', e);
      setIsGenerating(false);
    }
  };

  // Confirm and persist remembered preferences to Walrus via MemWal
  const handleConfirmRemember = async () => {
    if (pendingPreferences.length === 0) return;
    setIsSavingMemory(true);

    try {
      const res = await fetch('/api/memwal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remember', preferences: pendingPreferences }),
      });

      const data = await res.json();
      if (data.success) {
        const getRes = await fetch('/api/memwal');
        const getData = await getRes.json();
        if (getData.success && getData.preferences) {
          setActiveMemories(getData.preferences.filter((p: MediaPreference) => p.isActive));
        }
      }

      setPendingPreferences([]);
    } catch (e) {
      console.error('Failed to save to Walrus:', e);
    } finally {
      setIsSavingMemory(false);
    }
  };

  // Switch or Create New Project (Cross-Session Recall Demo)
  const handleCreateNewProject = (
    title = 'Project B - Minimalist Clothing Promo',
    prompt = 'Create a promo for my new clothing brand.'
  ) => {
    const newProj: CreativeProject = {
      id: `proj-${Date.now()}`,
      title,
      initialPrompt: prompt,
      createdAt: new Date().toISOString(),
      currentVersionIndex: 0,
      versions: [],
    };

    setProjects((prev) => [...prev, newProj]);
    const newIndex = projects.length;
    setCurrentProjectIndex(newIndex);
    setPendingPreferences([]);

    setMessages([
      {
        id: `msg-${Date.now()}`,
        sender: 'agent',
        content: `Switched to new project: "${title}".\nI will query your agent memory on Walrus and automatically apply your persistent preferences.`,
        timestamp: new Date().toISOString(),
      },
    ]);

    // Immediately trigger generation for Project B
    handleGenerate(prompt, 1);
  };

  // Forget memory
  const handleForgetMemory = async (id: string) => {
    try {
      await fetch('/api/memwal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'forget', id }),
      });
      setActiveMemories((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      console.error('Failed to forget memory:', e);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#18120e] font-light selection:bg-[#eed8c2] selection:text-[#18120e]">
      {/* 1. Navbar */}
      <NueNavbar
        onOpenVault={() => setIsMemoryPanelOpen(true)}
        activeCount={activeMemories.filter((m) => m.isActive).length}
      />

      {/* 2. Hero, Switcher & Code/Studio Window */}
      <main className="flex-1">
        <NueHero
          activeTab={heroTab}
          setActiveTab={setHeroTab}
          activeProject={activeProject}
          activeVersion={activeVersion}
          allVersions={activeProject.versions}
          onSelectVersion={(vIdx) => {
            setProjects((prev) => {
              const copy = [...prev];
              copy[currentProjectIndex].currentVersionIndex = vIdx;
              return copy;
            });
          }}
          isGenerating={isGenerating}
          messages={messages}
          onSendMessage={handleSendMessage}
          onRegenerate={() => {
            if (activeProject.initialPrompt) {
              handleGenerate(
                activeProject.initialPrompt,
                activeProject.versions.length + 1
              );
            }
          }}
          pendingPreferences={pendingPreferences}
          onConfirmRemember={handleConfirmRemember}
          onDismissPending={() => setPendingPreferences([])}
          isSavingMemory={isSavingMemory}
          onNewProject={() => handleCreateNewProject()}
          activeMemories={activeMemories}
          onOpenVault={() => setIsMemoryPanelOpen(true)}
          onOpenInspector={() => setIsInspectorOpen(true)}
        />

        {/* 3. Dark "Built for <developers>" Section */}
        <NueDevelopersSection />

        {/* 4. "How It Works" Section with Vertical Stepper */}
        <NueHowItWorks />

        {/* 5. "AI Memory That Adapts To Your Domain" Section */}
        <NueDomainsSection />

        {/* Call To Action Banner (Nue Vision) */}
        <section className="py-24 px-4 max-w-7xl mx-auto text-center font-light">
          <div className="p-10 sm:p-16 rounded-3xl bg-[#faf8f5] border border-[#e5e5e5] relative overflow-hidden shadow-sm">
            <h2 className="text-3xl sm:text-5xl font-medium text-[#18120e] mb-4 tracking-tight font-sans">
              Move AI agents from stateless tools to systems with continuity.
            </h2>
            <p className="text-sm sm:text-base text-stone-600 max-w-2xl mx-auto mb-8 leading-relaxed font-light">
              The future of agents is not just &ldquo;What can the agent do?&rdquo; but &ldquo;What does the agent know about me from everything we&apos;ve done before?&rdquo; Nue is the memory layer that makes that possible.
            </p>
            <button
              onClick={() => {
                setHeroTab('studio');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-md bg-[#18120e] text-white hover:bg-black font-medium text-sm transition shadow-md"
            >
              <Sparkles className="w-4 h-4 text-[#c88d51]" />
              <span>Try Interactive Demo</span>
            </button>
          </div>
        </section>
      </main>

      {/* Multi-Column Clean Footer */}
      <footer className="px-6 py-14 bg-white border-t border-[#f0f0f0] text-xs text-stone-600 font-light">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-[#18120e]" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="3" fill="currentColor" />
                <path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
              </svg>
              <span className="font-medium text-[#18120e] text-lg tracking-tight">nue</span>
            </div>
            <p className="text-stone-500 text-xs leading-relaxed mb-3 font-light">
              The memory infrastructure layer for AI agents.
            </p>
            <span className="text-[11px] font-mono text-[#9c4e1f] font-medium bg-[#fbf2e9] px-2 py-0.5 rounded border border-[#f0e2d3]">
              Founded by NextMathLabs
            </span>
          </div>

          <div>
            <h4 className="font-medium text-[#18120e] mb-3 uppercase tracking-wider text-[11px] font-mono">
              Product
            </h4>
            <ul className="space-y-2 text-stone-600 font-light">
              <li>
                <button onClick={() => { setHeroTab('studio'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-[#18120e] transition">
                  Media Memory (Shipped Feature)
                </button>
              </li>
              <li>
                <a href="#features" className="hover:text-[#18120e] transition">Memory Compression Engine</a>
              </li>
              <li>
                <a href="#features" className="hover:text-[#18120e] transition">Conflict Evolution</a>
              </li>
              <li>
                <button onClick={() => { setHeroTab('pipeline'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-[#18120e] transition">
                  Architecture Pipeline
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-[#18120e] mb-3 uppercase tracking-wider text-[11px] font-mono">
              Infrastructure
            </h4>
            <ul className="space-y-2 text-stone-600 font-light">
              <li>
                <a href="https://walrus.xyz" target="_blank" rel="noreferrer" className="hover:text-[#18120e] transition flex items-center gap-1">
                  Sui Walrus Storage <ExternalLink className="w-3 h-3 text-stone-400" />
                </a>
              </li>
              <li>
                <a href="https://memory.walrus.xyz" target="_blank" rel="noreferrer" className="hover:text-[#18120e] transition flex items-center gap-1">
                  Walrus MemWal SDK <ExternalLink className="w-3 h-3 text-stone-400" />
                </a>
              </li>
              <li>
                <a href="https://agent.livepeer.org" target="_blank" rel="noreferrer" className="hover:text-[#18120e] transition flex items-center gap-1">
                  Livepeer Agent MCP <ExternalLink className="w-3 h-3 text-stone-400" />
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-[#18120e] mb-3 uppercase tracking-wider text-[11px] font-mono">
              Company
            </h4>
            <ul className="space-y-2 text-stone-600 font-light">
              <li className="text-[#18120e] font-medium">NextMathLabs Inc.</li>
              <li><span className="text-[#9c4e1f]">Livepeer Agent Hackathon</span></li>
              <li className="text-stone-400">Aug 24 – Sep 21, 2026</li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 border-t border-[#f0f0f0] flex flex-col sm:flex-row items-center justify-between text-[11px] text-stone-500 gap-4 font-light">
          <div>
            © 2026 Nue · Founded by NextMathLabs. All rights reserved.
          </div>
          <div className="flex items-center gap-4 text-stone-600">
            <span>Powered by Walrus MemWal</span>
            <span>·</span>
            <span>Livepeer Agent</span>
          </div>
        </div>
      </footer>

      {/* Slide-over Walrus Memory Vault Drawer */}
      <MemoryPanel
        isOpen={isMemoryPanelOpen}
        onClose={() => setIsMemoryPanelOpen(false)}
        memories={activeMemories}
        onForget={handleForgetMemory}
      />

      {/* Prompt Orchestration Inspector Modal */}
      {activeVersion && (
        <EnrichedBriefModal
          isOpen={isInspectorOpen}
          onClose={() => setIsInspectorOpen(false)}
          rawBrief={activeVersion.brief}
          enrichedBrief={activeVersion.enrichedBrief}
          appliedMemories={activeVersion.appliedPreferences}
        />
      )}
    </div>
  );
}
