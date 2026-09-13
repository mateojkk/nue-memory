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
    <div className="flex flex-col min-h-screen bg-black text-zinc-100 mem0-bg-grid relative selection:bg-[#c88d51]/30 selection:text-[#fbf7ee]">
      {/* Subtle top ambient radial glow */}
      <div className="absolute top-0 inset-x-0 h-[600px] mem0-radial-glow pointer-events-none" />

      {/* Floating Pill Header (Strict Mem0 Style) */}
      <header className="sticky top-0 z-50 px-4 sm:px-6 py-3.5 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#c88d51] via-[#b45a27] to-[#78350f] flex items-center justify-center shadow-md shadow-[#9c4e1f]/30 border border-[#dda15e]/30">
              <Sparkles className="w-4 h-4 text-[#fbf7ee]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-white">Nue Memory</span>
              <span className="hidden sm:inline-flex text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#18120e] text-[#ab9482] border border-[#38281e]">
                A NextMathLabs Company
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-[#ab9482]">
            <a href="#features" className="hover:text-[#fbf7ee] transition">Capabilities</a>
            <a href="#studio" className="hover:text-[#fbf7ee] transition">Interactive Studio</a>
            <a href="#how-it-works" className="hover:text-[#fbf7ee] transition">How It Works</a>
            <a href="#sdk" className="hover:text-[#fbf7ee] transition">SDK</a>
          </nav>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsMemoryPanelOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-[#140e0b] hover:bg-[#201712] border border-white/10 hover:border-[#c88d51]/40 text-xs font-mono text-[#cbbba8] hover:text-[#fbf7ee] flex items-center gap-1.5 transition"
            >
              <Database className="w-3.5 h-3.5 text-[#dda15e]" />
              <span className="hidden sm:inline">Walrus</span>
              <span>Vault</span>
              {activeMemories.filter((m) => m.isActive).length > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#c88d51] text-black text-[9px] font-bold flex items-center justify-center">
                  {activeMemories.filter((m) => m.isActive).length}
                </span>
              )}
            </button>

            <a
              href="#studio"
              onClick={() => setHeroTab('studio')}
              className="px-3.5 py-1.5 rounded-lg bg-[#fbf7ee] text-[#140e0b] hover:bg-[#ede4d1] font-semibold text-xs transition shadow-sm flex items-center gap-1"
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
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#18120e] border border-[#c88d51]/30 text-[#dda15e] text-xs font-mono font-medium mb-8 hover:border-[#c88d51]/60 transition">
          <span className="w-1.5 h-1.5 rounded-full bg-[#dda15e] animate-pulse" />
          <span>Introducing Media Memory · Persistent Creative Intelligence for Livepeer Agents</span>
          <ArrowRight className="w-3 h-3" />
        </div>

        {/* Large Mem0 Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white mb-6 max-w-5xl mx-auto leading-[1.1]">
          Creative memory that persists{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#dda15e] via-[#fbf7ee] to-[#c88d51]">
            across projects &amp; media agents
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg md:text-xl text-[#ab9482] max-w-3xl mx-auto mb-10 leading-relaxed font-normal">
          The decentralized memory layer for Livepeer Agent. Nue Memory captures creative feedback and stores preferences on Sui Walrus via MemWal—delivering zero-reprompt personalization across every new project.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 mb-10">
          <a
            href="#studio"
            onClick={() => setHeroTab('studio')}
            className="px-6 py-3 rounded-xl bg-[#fbf7ee] text-[#140e0b] hover:bg-[#ede4d1] font-bold text-sm transition shadow-lg shadow-[#c88d51]/10 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-[#9c4e1f]" />
            <span>Try Interactive Studio</span>
          </a>

          <button
            onClick={() => setIsMemoryPanelOpen(true)}
            className="px-5 py-3 rounded-xl bg-[#140e0b] hover:bg-[#201712] border border-white/10 hover:border-[#c88d51]/40 text-sm font-medium text-[#cbbba8] hover:text-white transition flex items-center gap-2"
          >
            <Database className="w-4 h-4 text-[#dda15e]" />
            <span>Inspect Walrus Vault</span>
          </button>
        </div>

        {/* Mem0 Quick Install Snippet */}
        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-[#0d0a08] border border-white/10 font-mono text-xs text-[#ab9482]">
          <Terminal className="w-3.5 h-3.5 text-[#dda15e]" />
          <span className="text-zinc-300">npm i @nue-memory/media-memory @mysten-incubation/memwal</span>
          <button
            onClick={copyInstallCommand}
            className="p-1 hover:text-white transition ml-1"
            title="Copy command"
          >
            {copiedInstall ? (
              <Check className="w-3.5 h-3.5 text-[#dda15e]" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-[#ab9482]" />
            )}
          </button>
        </div>
      </section>

      {/* Hero Interactive Component (Mem0 Tabbed Window) */}
      <section id="studio" className="px-4 max-w-7xl mx-auto pb-24 relative z-10">
        <div className="rounded-2xl bg-[#09090b] border border-white/10 shadow-2xl shadow-black overflow-hidden">
          {/* Tab Header Bar */}
          <div className="px-4 py-3 bg-[#0d0a08] border-b border-white/5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#38281e]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#563b28]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#784e2a]" />
              </div>

              {/* Navigation Tabs */}
              <div className="flex bg-[#140e0b] p-1 rounded-lg border border-white/5 text-xs font-mono">
                <button
                  onClick={() => setHeroTab('studio')}
                  className={`px-3 py-1 rounded-md transition ${
                    heroTab === 'studio'
                      ? 'bg-[#241a14] text-[#fbf7ee] border border-[#c88d51]/30 font-semibold'
                      : 'text-[#ab9482] hover:text-white'
                  }`}
                >
                  Live Studio (Demo)
                </button>
                <button
                  onClick={() => setHeroTab('sdk')}
                  className={`px-3 py-1 rounded-md transition ${
                    heroTab === 'sdk'
                      ? 'bg-[#241a14] text-[#fbf7ee] border border-[#c88d51]/30 font-semibold'
                      : 'text-[#ab9482] hover:text-white'
                  }`}
                >
                  SDK Integration
                </button>
                <button
                  onClick={() => setHeroTab('orchestrator')}
                  className={`px-3 py-1 rounded-md transition ${
                    heroTab === 'orchestrator'
                      ? 'bg-[#241a14] text-[#fbf7ee] border border-[#c88d51]/30 font-semibold'
                      : 'text-[#ab9482] hover:text-white'
                  }`}
                >
                  Context Orchestrator
                </button>
                <button
                  onClick={() => setHeroTab('vault')}
                  className={`px-3 py-1 rounded-md transition ${
                    heroTab === 'vault'
                      ? 'bg-[#241a14] text-[#fbf7ee] border border-[#c88d51]/30 font-semibold'
                      : 'text-[#ab9482] hover:text-white'
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
                  className="px-2.5 py-1 rounded-lg bg-[#1a130f] hover:bg-[#281c15] text-[#dda15e] border border-[#c88d51]/30 text-[11px] font-mono flex items-center gap-1.5 transition"
                  title="Test cross-project recall with zero reprompting"
                >
                  <Plus className="w-3 h-3" />
                  <span>New Project (Demo)</span>
                </button>

                {activeVersion && (
                  <button
                    onClick={() => setIsInspectorOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-[#140e0b] hover:bg-[#1f1611] text-[#ab9482] hover:text-white border border-white/5 text-[11px] font-mono flex items-center gap-1 transition"
                  >
                    <Layers className="w-3 h-3 text-[#c88d51]" />
                    <span>Inspect Context</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Banner notification */}
          {bannerNotice && (
            <div className="px-5 py-2 bg-[#1b120c] border-b border-[#c88d51]/30 text-xs font-mono text-[#dda15e] flex items-center justify-between animate-fadeIn">
              <span className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#dda15e]" />
                {bannerNotice}
              </span>
              <button
                onClick={() => setBannerNotice(null)}
                className="text-[10px] text-zinc-500 hover:text-white ml-4"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Tab Content Display */}
          <div className="p-4 sm:p-6 bg-[#09090b]">
            {/* TAB 1: LIVE STUDIO */}
            {heroTab === 'studio' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[640px]">
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
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-[#dda15e]" />
                    <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                      Walrus Decentralized Blobs on Sui
                    </span>
                  </div>
                  <span className="text-zinc-500 text-[10px]">
                    {activeMemories.filter((m) => m.isActive).length} active preferences stored
                  </span>
                </div>

                {activeMemories.length === 0 ? (
                  <div className="text-center py-12 text-[#ab9482]">
                    <p className="mb-2">No preferences committed to Walrus yet.</p>
                    <p className="text-[11px] text-zinc-600">
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
                            ? 'bg-[#140e0b] border-[#c88d51]/30'
                            : 'bg-[#0e0c0a] border-white/5 opacity-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-[#c88d51]/20 text-[#dda15e]">
                            {mem.category}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            {mem.memwalBlobId || 'walrus-blob'}
                          </span>
                        </div>
                        <p className="text-[#fbf7ee] text-xs mb-3 leading-relaxed">
                          {mem.preference}
                        </p>
                        <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px] text-zinc-500">
                          <span>Strength: {mem.strength}</span>
                          <button
                            onClick={() => handleForgetMemory(mem.id)}
                            className="text-red-400/80 hover:text-red-300 transition"
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
      <section className="py-10 border-y border-white/5 bg-[#070504]">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center font-mono">
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-[#dda15e] mb-1">100%</div>
            <div className="text-xs text-[#ab9482]">Zero-Reprompt Recall</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-white mb-1">12</div>
            <div className="text-xs text-[#ab9482]">Creative Taxonomy Categories</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-[#dda15e] mb-1">Sui Walrus</div>
            <div className="text-xs text-[#ab9482]">MemWal Decentralized Storage</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-white mb-1">Livepeer MCP</div>
            <div className="text-xs text-[#ab9482]">Autonomous Media Agents</div>
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
        <div className="p-10 sm:p-16 rounded-3xl bg-gradient-to-b from-[#140e0b] to-[#09090b] border border-[#c88d51]/30 relative overflow-hidden">
          <div className="absolute inset-0 bg-radial from-[#c88d51]/10 to-transparent blur-3xl pointer-events-none" />
          <h2 className="text-3xl sm:text-5xl font-bold text-white mb-4 relative z-10">
            Give your creative agents memory.
          </h2>
          <p className="text-sm sm:text-base text-[#ab9482] max-w-xl mx-auto mb-8 relative z-10 leading-relaxed">
            Autonomous media agents shouldn&apos;t suffer from creative amnesia. Nue Memory is built by NextMathLabs for the future of decentralized creative AI.
          </p>
          <a
            href="#studio"
            onClick={() => setHeroTab('studio')}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#fbf7ee] text-[#140e0b] hover:bg-[#ede4d1] font-bold text-sm transition shadow-xl relative z-10"
          >
            <Sparkles className="w-4 h-4 text-[#9c4e1f]" />
            <span>Launch Studio Now</span>
          </a>
        </div>
      </section>

      {/* Multi-Column Footer (Mem0 Style) */}
      <footer className="px-6 py-12 bg-[#070504] border-t border-white/5 text-xs text-[#ab9482]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-6 h-6 rounded-lg bg-[#c88d51] flex items-center justify-center text-black font-bold text-xs">
                N
              </div>
              <span className="font-bold text-white text-sm">Nue Memory</span>
            </div>
            <p className="text-zinc-400 text-xs leading-relaxed mb-3">
              Decentralized persistent creative memory for AI media agents.
            </p>
            <span className="text-[11px] font-mono text-[#dda15e]">
              A NextMathLabs Company
            </span>
          </div>

          <div>
            <h4 className="font-bold text-white mb-3 uppercase tracking-wider text-[10px] font-mono">
              Product
            </h4>
            <ul className="space-y-2 font-mono text-[11px]">
              <li><a href="#studio" className="hover:text-white transition">Media Memory</a></li>
              <li><a href="#features" className="hover:text-white transition">Autonomous Extraction</a></li>
              <li><a href="#features" className="hover:text-white transition">Conflict Evolution</a></li>
              <li><a href="#features" className="hover:text-white transition">Context Orchestrator</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-3 uppercase tracking-wider text-[10px] font-mono">
              Infrastructure
            </h4>
            <ul className="space-y-2 font-mono text-[11px]">
              <li><a href="https://agent.livepeer.org" target="_blank" rel="noreferrer" className="hover:text-white transition flex items-center gap-1">Livepeer Agent MCP <ExternalLink className="w-3 h-3 text-zinc-600" /></a></li>
              <li><a href="https://memory.walrus.xyz" target="_blank" rel="noreferrer" className="hover:text-white transition flex items-center gap-1">Walrus MemWal <ExternalLink className="w-3 h-3 text-zinc-600" /></a></li>
              <li><a href="https://walrus.xyz" target="_blank" rel="noreferrer" className="hover:text-white transition flex items-center gap-1">Sui Walrus Storage <ExternalLink className="w-3 h-3 text-zinc-600" /></a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-3 uppercase tracking-wider text-[10px] font-mono">
              Company
            </h4>
            <ul className="space-y-2 font-mono text-[11px]">
              <li className="text-zinc-300">NextMathLabs Inc.</li>
              <li><span className="text-[#dda15e]">Livepeer Agent Hackathon</span></li>
              <li className="text-zinc-500">Aug 24 – Sep 21, 2026</li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-zinc-500 gap-4">
          <div>
            © 2026 Nue Memory · A NextMathLabs company. All rights reserved.
          </div>
          <div className="flex items-center gap-4 text-zinc-400">
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
