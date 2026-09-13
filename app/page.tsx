'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Database,
  Layers,
  Film,
  Plus,
  ArrowRight,
  Copy,
  Check,
  Code2,
  ExternalLink,
  ShieldCheck,
  Cpu,
  RefreshCw,
  Terminal,
} from 'lucide-react';
import { MediaPreview } from '@/components/MediaPreview';
import { AgentChat } from '@/components/AgentChat';
import { MemoryConfirmation } from '@/components/MemoryConfirmation';
import { MemoryPanel } from '@/components/MemoryPanel';
import { EnrichedBriefModal } from '@/components/EnrichedBriefModal';
import { BentoGrid } from '@/components/BentoGrid';
import { HowItWorks } from '@/components/HowItWorks';
import { SdkShowcase } from '@/components/SdkShowcase';
import { PromptOrchestratorView } from '@/components/PromptOrchestratorView';
import {
  CreativeProject,
  MediaVersion,
  ChatMessage,
  MediaPreference,
} from '@/lib/types';

export default function Home() {
  // Hero Interactive Tabs
  const [heroTab, setHeroTab] = useState<'studio' | 'sdk' | 'orchestrator' | 'vault'>('studio');
  const [copiedInstall, setCopiedInstall] = useState(false);

  // Projects State
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
        'Welcome to Media Studio. I am your Livepeer Media Agent.\n\nEnter a creative brief or try one of the suggestions below to start generating.',
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

  // Notification Banner
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  const activeProject = projects[currentProjectIndex];
  const activeVersion =
    activeProject?.versions?.length > 0
      ? activeProject.versions[activeProject.currentVersionIndex]
      : null;

  // Load initial memories from MemWal
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

        if (appliedCount > 0) {
          setBannerNotice(
            `Powered by Nue Memory · ${appliedCount} preference(s) remembered from previous creative work`
          );
        }
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

    // Otherwise, this is review feedback on the current version!
    setIsGenerating(true);

    try {
      // Step 1: Classify feedback and extract preferences
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

      // Step 2: Livepeer Agent regenerates revised version
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
      setBannerNotice(
        `Successfully saved ${pendingPreferences.length} creative preference(s) to Walrus Memory.`
      );
    } catch (e) {
      console.error('Failed to save to Walrus:', e);
    } finally {
      setIsSavingMemory(false);
    }
  };

  // Switch or Create New Project
  const handleCreateNewProject = (title: string, prompt: string) => {
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
    setBannerNotice(null);

    setMessages([
      {
        id: `msg-${Date.now()}`,
        sender: 'agent',
        content: `Switched to new project: "${title}".\nI will check your Media Memory on Walrus and automatically apply any relevant preferences.`,
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

  const copyInstallCommand = () => {
    navigator.clipboard.writeText('npm i @nue-memory/media-memory @mysten-incubation/memwal');
    setCopiedInstall(true);
    setTimeout(() => setCopiedInstall(false), 2000);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#faf8f5] text-[#18120e] mem0-bg-grid relative selection:bg-[#eed8c2] selection:text-[#18120e]">
      {/* Subtle top ambient radial glow */}
      <div className="absolute top-0 inset-x-0 h-[600px] mem0-radial-glow pointer-events-none" />

      {/* Floating Pill Header (Strict Mem0 Style) */}
      <header className="sticky top-0 z-50 px-4 sm:px-8 py-3.5 bg-white/85 backdrop-blur-xl border-b border-[#e7e2da]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1a120c] via-[#78350f] to-[#c88d51] flex items-center justify-center shadow-md shadow-[#9c4e1f]/20 border border-[#e2d5c5]">
              <Sparkles className="w-4 h-4 text-[#fbf7ee]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-[#18120e]">Nue Memory</span>
              <span className="hidden sm:inline-flex text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#f5ece4] text-[#78350f] border border-[#e2d5c5] font-semibold">
                A NextMathLabs Company
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-[#786152]">
            <a href="#features" className="hover:text-[#18120e] transition">Capabilities</a>
            <a href="#studio" className="hover:text-[#18120e] transition">Interactive Studio</a>
            <a href="#how-it-works" className="hover:text-[#18120e] transition">How It Works</a>
            <a href="#sdk" className="hover:text-[#18120e] transition">SDK</a>
          </nav>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsMemoryPanelOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#faf6f0] border border-[#e7e2da] hover:border-[#c88d51]/50 text-xs font-mono text-[#18120e] flex items-center gap-1.5 transition shadow-2xs font-semibold"
            >
              <Database className="w-3.5 h-3.5 text-[#9c4e1f]" />
              <span className="hidden sm:inline">Walrus</span>
              <span>Vault</span>
              {activeMemories.filter((m) => m.isActive).length > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#9c4e1f] text-white text-[9px] font-bold flex items-center justify-center">
                  {activeMemories.filter((m) => m.isActive).length}
                </span>
              )}
            </button>

            <a
              href="#studio"
              onClick={() => setHeroTab('studio')}
              className="px-4 py-1.5 rounded-xl bg-[#1a120c] text-white hover:bg-[#281c15] font-bold text-xs transition shadow-sm flex items-center gap-1"
            >
              <span>Launch Studio</span>
              <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section (Strict Mem0 Style) */}
      <section className="pt-20 pb-12 px-4 max-w-7xl mx-auto text-center relative z-10">
        {/* Announcement Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#f5ece4] border border-[#e2d5c5] text-[#78350f] text-xs font-mono font-bold mb-8 hover:border-[#c88d51]/60 transition shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-[#9c4e1f] animate-pulse" />
          <span>Introducing Media Memory · Persistent Creative Intelligence for Livepeer Agents</span>
          <ArrowRight className="w-3 h-3" />
        </div>

        {/* Large Mem0 Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-[#18120e] mb-6 max-w-5xl mx-auto leading-[1.08]">
          AI media agents forget.{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9c4e1f] via-[#c88d51] to-[#b45a27]">
            Nue Memory remembers.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg md:text-xl text-[#786152] max-w-3xl mx-auto mb-10 leading-relaxed font-normal">
          The decentralized memory layer for Livepeer Agent. Nue Memory captures creative feedback and stores preferences on Sui Walrus via MemWal—delivering zero-reprompt personalization across every new project.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 mb-10">
          <a
            href="#studio"
            onClick={() => setHeroTab('studio')}
            className="px-6 py-3.5 rounded-xl bg-[#1a120c] text-white hover:bg-[#281c15] font-bold text-sm transition shadow-md shadow-[#1a120c]/15 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-[#dda15e]" />
            <span>Try Interactive Studio</span>
          </a>

          <button
            onClick={() => setIsMemoryPanelOpen(true)}
            className="px-5 py-3.5 rounded-xl bg-white hover:bg-[#faf6f0] border border-[#e7e2da] hover:border-[#c88d51]/50 text-sm font-semibold text-[#18120e] transition flex items-center gap-2 shadow-2xs"
          >
            <Database className="w-4 h-4 text-[#9c4e1f]" />
            <span>Inspect Walrus Vault</span>
          </button>
        </div>

        {/* Mem0 Quick Install Snippet */}
        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-white border border-[#e7e2da] font-mono text-xs text-[#18120e] shadow-2xs">
          <Terminal className="w-3.5 h-3.5 text-[#9c4e1f]" />
          <span className="text-[#18120e] font-medium">npm i @nue-memory/media-memory @mysten-incubation/memwal</span>
          <button
            onClick={copyInstallCommand}
            className="p-1 text-[#786152] hover:text-[#18120e] transition ml-1"
            title="Copy command"
          >
            {copiedInstall ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </section>

      {/* Hero Interactive Component (Mem0 Tabbed Window) */}
      <section id="studio" className="px-4 max-w-7xl mx-auto pb-24 relative z-10">
        <div className="rounded-2xl bg-white border border-[#e7e2da] shadow-xl shadow-[#c88d51]/5 overflow-hidden">
          {/* Tab Header Bar */}
          <div className="px-4 py-3.5 bg-[#faf6f0] border-b border-[#e7e2da] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#d4c5b5]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#b89f89]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#9c785d]" />
              </div>

              {/* Navigation Tabs */}
              <div className="flex bg-[#f5ece4] p-1 rounded-xl border border-[#e2d5c5] text-xs font-mono">
                <button
                  onClick={() => setHeroTab('studio')}
                  className={`px-3.5 py-1.5 rounded-lg transition ${
                    heroTab === 'studio'
                      ? 'bg-white text-[#18120e] font-bold shadow-2xs border border-[#e2d5c5]'
                      : 'text-[#786152] hover:text-[#18120e]'
                  }`}
                >
                  Live Studio (Demo)
                </button>
                <button
                  onClick={() => setHeroTab('sdk')}
                  className={`px-3.5 py-1.5 rounded-lg transition ${
                    heroTab === 'sdk'
                      ? 'bg-white text-[#18120e] font-bold shadow-2xs border border-[#e2d5c5]'
                      : 'text-[#786152] hover:text-[#18120e]'
                  }`}
                >
                  SDK Integration
                </button>
                <button
                  onClick={() => setHeroTab('orchestrator')}
                  className={`px-3.5 py-1.5 rounded-lg transition ${
                    heroTab === 'orchestrator'
                      ? 'bg-white text-[#18120e] font-bold shadow-2xs border border-[#e2d5c5]'
                      : 'text-[#786152] hover:text-[#18120e]'
                  }`}
                >
                  Context Orchestrator
                </button>
                <button
                  onClick={() => setHeroTab('vault')}
                  className={`px-3.5 py-1.5 rounded-lg transition ${
                    heroTab === 'vault'
                      ? 'bg-white text-[#18120e] font-bold shadow-2xs border border-[#e2d5c5]'
                      : 'text-[#786152] hover:text-[#18120e]'
                  }`}
                >
                  Walrus Vault ({activeMemories.filter((m) => m.isActive).length})
                </button>
              </div>
            </div>

            {/* Quick Demo Action in Studio Tab */}
            {heroTab === 'studio' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    handleCreateNewProject(
                      'Project B - Minimalist Clothing Promo',
                      'Create a promo for my new clothing brand.'
                    )
                  }
                  className="px-3 py-1.5 rounded-xl bg-[#f5ece4] hover:bg-[#ede0d4] text-[#78350f] border border-[#e2d5c5] text-xs font-mono font-bold flex items-center gap-1.5 transition shadow-2xs"
                  title="Test cross-project recall with zero reprompting"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Project (Demo)</span>
                </button>

                {activeVersion && (
                  <button
                    onClick={() => setIsInspectorOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#faf6f0] text-[#18120e] border border-[#e7e2da] text-xs font-mono font-semibold flex items-center gap-1.5 transition shadow-2xs"
                  >
                    <Layers className="w-3.5 h-3.5 text-[#9c4e1f]" />
                    <span>Inspect Context</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Banner notification */}
          {bannerNotice && (
            <div className="px-5 py-2.5 bg-[#f5ece4] border-b border-[#e2d5c5] text-xs font-mono text-[#78350f] font-semibold flex items-center justify-between animate-fadeIn">
              <span className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#9c4e1f]" />
                {bannerNotice}
              </span>
              <button
                onClick={() => setBannerNotice(null)}
                className="text-[10px] text-stone-500 hover:text-[#18120e] ml-4 font-bold"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Tab Content Display */}
          <div className="p-4 sm:p-6 bg-[#faf8f5]">
            {/* TAB 1: LIVE STUDIO */}
            {heroTab === 'studio' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[640px]">
                {/* Left: Media Preview & Player Canvas (7 Cols) */}
                <div className="lg:col-span-7 flex flex-col">
                  <MediaPreview
                    version={activeVersion}
                    allVersions={activeProject.versions}
                    selectedVersionIndex={activeProject.currentVersionIndex}
                    isLoading={isGenerating}
                    onSelectVersion={(vIdx) => {
                      setProjects((prev) => {
                        const copy = [...prev];
                        copy[currentProjectIndex].currentVersionIndex = vIdx;
                        return copy;
                      });
                    }}
                  />
                </div>

                {/* Right: Agent Chat, Directives, and Memory Loop (5 Cols) */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                  {/* Contextual Memory Confirmation Card */}
                  {pendingPreferences.length > 0 && (
                    <MemoryConfirmation
                      detectedPreferences={pendingPreferences}
                      onConfirmRemember={handleConfirmRemember}
                      onDismiss={() => setPendingPreferences([])}
                      isSaving={isSavingMemory}
                    />
                  )}

                  {/* Agent Conversational Review */}
                  <div className="flex-1 flex flex-col">
                    <AgentChat
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
                      isLoading={isGenerating}
                      suggestions={
                        activeProject.versions.length === 0
                          ? [
                              'Create a 20-second product promo for my new app.',
                              'Create an energetic social clip for fitness apparel.',
                            ]
                          : [
                              'The intro is too slow. Make the captions larger and remove this style of background music.',
                              'Make the intro smoother and switch to a cinematic visual theme.',
                            ]
                      }
                      onSelectSuggestion={(sug) => handleSendMessage(sug)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SDK INTEGRATION */}
            {heroTab === 'sdk' && (
              <div className="max-w-4xl mx-auto">
                <PromptOrchestratorView
                  rawBrief={activeVersion?.brief || 'Create a promo for my new clothing brand.'}
                  enrichedBrief={
                    activeVersion?.enrichedBrief ||
                    'Create a promo for my new clothing brand.\n\n[Enriched by Nue Memory with persistent user preferences]:\n- [PACING]: Fast intro in first 5s\n- [CAPTIONS]: Large high-contrast captions\n- [MUSIC]: Subtle modern rhythm bed'
                  }
                  appliedMemories={activeVersion?.appliedPreferences || activeMemories.slice(0, 3)}
                />
              </div>
            )}

            {/* TAB 3: CONTEXT ORCHESTRATOR */}
            {heroTab === 'orchestrator' && (
              <div className="max-w-5xl mx-auto">
                <PromptOrchestratorView
                  rawBrief={activeVersion?.brief || 'Create a promo for my new clothing brand.'}
                  enrichedBrief={
                    activeVersion?.enrichedBrief ||
                    'Create a promo for my new clothing brand.\n\n[Enriched by Nue Memory with persistent user preferences]:\n- [PACING]: Fast intro in first 5s\n- [CAPTIONS]: Large high-contrast captions\n- [MUSIC]: Subtle modern rhythm bed'
                  }
                  appliedMemories={activeVersion?.appliedPreferences || activeMemories.filter((m) => m.isActive)}
                />
              </div>
            )}

            {/* TAB 4: WALRUS MEMORY VAULT */}
            {heroTab === 'vault' && (
              <div className="max-w-4xl mx-auto font-mono text-xs">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#e7e2da]">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-[#9c4e1f]" />
                    <span className="font-bold text-[#18120e] uppercase tracking-wider text-[11px]">
                      Walrus Decentralized Blobs on Sui
                    </span>
                  </div>
                  <span className="text-[#786152] text-[10px]">
                    {activeMemories.filter((m) => m.isActive).length} active preferences stored
                  </span>
                </div>

                {activeMemories.length === 0 ? (
                  <div className="text-center py-12 text-[#786152]">
                    <p className="mb-2">No preferences committed to Walrus yet.</p>
                    <p className="text-[11px] text-stone-400">
                      Generate a clip in Live Studio, provide feedback, and click &quot;Remember in Walrus Memory&quot;.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {activeMemories.map((mem) => (
                      <div
                        key={mem.id}
                        className={`p-4 rounded-xl border transition ${
                          mem.isActive
                            ? 'bg-white border-[#e7e2da] shadow-2xs'
                            : 'bg-[#faf6f0] border-[#e7e2da] opacity-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-[#f5ece4] text-[#78350f]">
                            {mem.category}
                          </span>
                          <span className="text-[10px] text-stone-400">
                            {mem.memwalBlobId || 'walrus-blob'}
                          </span>
                        </div>
                        <p className="text-[#18120e] text-xs mb-3 leading-relaxed font-sans font-medium">
                          {mem.preference}
                        </p>
                        <div className="flex items-center justify-between pt-2 border-t border-[#e7e2da] text-[10px] text-stone-400">
                          <span>Strength: {mem.strength}</span>
                          <button
                            onClick={() => handleForgetMemory(mem.id)}
                            className="text-red-500 hover:text-red-700 transition font-bold"
                          >
                            Forget
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Social Proof & Metrics Strip */}
      <section className="py-12 border-y border-[#e7e2da] bg-white">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center font-mono">
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-[#9c4e1f] mb-1">100%</div>
            <div className="text-xs text-[#786152]">Zero-Reprompt Recall</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-[#18120e] mb-1">12</div>
            <div className="text-xs text-[#786152]">Creative Taxonomy Categories</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-[#9c4e1f] mb-1">Sui Walrus</div>
            <div className="text-xs text-[#786152]">MemWal Decentralized Storage</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-[#18120e] mb-1">Livepeer MCP</div>
            <div className="text-xs text-[#786152]">Autonomous Media Agents</div>
          </div>
        </div>
      </section>

      {/* Bento Grid Features ("Built for creators who want proof, not promises") */}
      <BentoGrid />

      {/* How It Works 4-Step Pipeline */}
      <HowItWorks />

      {/* Developer SDK Showcase */}
      <SdkShowcase />

      {/* Mem0 Call To Action Banner */}
      <section className="py-24 px-4 max-w-7xl mx-auto text-center relative">
        <div className="p-10 sm:p-16 rounded-3xl bg-gradient-to-b from-[#f5ece4] to-white border border-[#e2d5c5] relative overflow-hidden shadow-lg shadow-[#c88d51]/5">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-[#18120e] mb-4 relative z-10 tracking-tight">
            Give your creative agents memory.
          </h2>
          <p className="text-sm sm:text-base text-[#786152] max-w-xl mx-auto mb-8 relative z-10 leading-relaxed font-normal">
            Autonomous media agents shouldn&apos;t suffer from creative amnesia. Nue Memory is built by NextMathLabs for the future of decentralized creative AI.
          </p>
          <a
            href="#studio"
            onClick={() => setHeroTab('studio')}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#1a120c] text-white hover:bg-[#281c15] font-bold text-sm transition shadow-lg shadow-[#1a120c]/15 relative z-10"
          >
            <Sparkles className="w-4 h-4 text-[#dda15e]" />
            <span>Launch Studio Now</span>
          </a>
        </div>
      </section>

      {/* Multi-Column Footer (Mem0 Style) */}
      <footer className="px-6 py-14 bg-white border-t border-[#e7e2da] text-xs text-[#786152]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-6 h-6 rounded-lg bg-[#1a120c] flex items-center justify-center text-white font-bold text-xs">
                N
              </div>
              <span className="font-bold text-[#18120e] text-sm">Nue Memory</span>
            </div>
            <p className="text-[#786152] text-xs leading-relaxed mb-3">
              Decentralized persistent creative memory for AI media agents.
            </p>
            <span className="text-[11px] font-mono text-[#9c4e1f] font-semibold bg-[#f5ece4] px-2 py-0.5 rounded border border-[#e2d5c5]">
              A NextMathLabs Company
            </span>
          </div>

          <div>
            <h4 className="font-bold text-[#18120e] mb-3 uppercase tracking-wider text-[10px] font-mono">
              Product
            </h4>
            <ul className="space-y-2 font-mono text-[11px]">
              <li><a href="#studio" className="hover:text-[#18120e] transition">Media Memory</a></li>
              <li><a href="#features" className="hover:text-[#18120e] transition">Autonomous Extraction</a></li>
              <li><a href="#features" className="hover:text-[#18120e] transition">Conflict Evolution</a></li>
              <li><a href="#features" className="hover:text-[#18120e] transition">Context Orchestrator</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-[#18120e] mb-3 uppercase tracking-wider text-[10px] font-mono">
              Infrastructure
            </h4>
            <ul className="space-y-2 font-mono text-[11px]">
              <li><a href="https://agent.livepeer.org" target="_blank" rel="noreferrer" className="hover:text-[#18120e] transition flex items-center gap-1">Livepeer Agent MCP <ExternalLink className="w-3 h-3 text-stone-400" /></a></li>
              <li><a href="https://memory.walrus.xyz" target="_blank" rel="noreferrer" className="hover:text-[#18120e] transition flex items-center gap-1">Walrus MemWal <ExternalLink className="w-3 h-3 text-stone-400" /></a></li>
              <li><a href="https://walrus.xyz" target="_blank" rel="noreferrer" className="hover:text-[#18120e] transition flex items-center gap-1">Sui Walrus Storage <ExternalLink className="w-3 h-3 text-stone-400" /></a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-[#18120e] mb-3 uppercase tracking-wider text-[10px] font-mono">
              Company
            </h4>
            <ul className="space-y-2 font-mono text-[11px]">
              <li className="text-[#18120e] font-semibold">NextMathLabs Inc.</li>
              <li><span className="text-[#9c4e1f]">Livepeer Agent Hackathon</span></li>
              <li className="text-stone-400">Aug 24 – Sep 21, 2026</li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 border-t border-[#e7e2da] flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-stone-500 gap-4">
          <div>
            © 2026 Nue Memory · A NextMathLabs company. All rights reserved.
          </div>
          <div className="flex items-center gap-4 text-[#786152]">
            <span>Powered by Walrus MemWal</span>
            <span>·</span>
            <span>Livepeer Agent</span>
          </div>
        </div>
      </footer>

      {/* Slide-over Memory Vault Drawer */}
      <MemoryPanel
        isOpen={isMemoryPanelOpen}
        onClose={() => setIsMemoryPanelOpen(false)}
        memories={activeMemories}
        onForget={handleForgetMemory}
      />

      {/* Context Inspector Modal */}
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
