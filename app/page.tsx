'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Database,
  PlusCircle,
  FolderOpen,
  Info,
  Layers,
  Bot,
  Zap,
  CheckCircle,
  PlayCircle,
  Film,
} from 'lucide-react';
import { MediaPreview } from '@/components/MediaPreview';
import { AgentChat } from '@/components/AgentChat';
import { MemoryConfirmation } from '@/components/MemoryConfirmation';
import { MemoryPanel } from '@/components/MemoryPanel';
import { EnrichedBriefModal } from '@/components/EnrichedBriefModal';
import { CreativeProject, MediaVersion, MediaPreference, ChatMessage } from '@/lib/types';

export default function MediaStudioPage() {
  // Active Project State
  const [projects, setProjects] = useState<CreativeProject[]>([
    {
      id: 'proj-promo-app',
      title: 'App Promo Video',
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
    // Add user message
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

  return (
    <div className="flex flex-col min-h-screen bg-black text-zinc-100 mem0-bg-grid relative selection:bg-purple-500/30 selection:text-white">
      {/* Subtle top ambient radial glow */}
      <div className="absolute top-0 inset-x-0 h-64 mem0-radial-glow pointer-events-none" />

      {/* Top Navbar */}
      <header className="px-5 py-3 bg-black/85 backdrop-blur-xl border-b border-white/10 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#c88d51] via-[#b45a27] to-[#78350f] flex items-center justify-center shadow-md shadow-[#9c4e1f]/30 border border-[#dda15e]/30">
            <Sparkles className="w-4 h-4 text-[#fbf7ee]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xs font-bold tracking-tight text-white flex items-center gap-1.5">
                <span>Nue Memory</span>
                <span className="text-zinc-600 font-normal">/</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e6af72] via-[#fbf7ee] to-[#c88d51] font-semibold">
                  Media Memory
                </span>
              </h1>
              <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#c88d51]/10 text-[#dda15e] border border-[#c88d51]/25">
                Track 03 · Innovation
              </span>
              <span className="hidden sm:inline-flex text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#18120e] text-[#ab9482] border border-[#38281e]">
                A NextMathLabs Company
              </span>
            </div>
            <p className="text-[10px] text-[#ab9482] font-mono">
              Decentralized persistent creative preference layer for Livepeer Agent
            </p>
          </div>
        </div>

        {/* Project Selector & Memory Drawer Buttons */}
        <div className="flex items-center gap-2">
          {/* Project Switcher */}
          <div className="flex items-center bg-[#12100e] border border-white/10 hover:border-[#c88d51]/30 rounded-xl px-2.5 py-1 text-xs transition">
            <span className="text-[#ab9482] text-[10px] font-mono mr-1.5 flex items-center gap-1">
              <Film className="w-3 h-3 text-[#c88d51]" />
              Project:
            </span>
            <select
              value={currentProjectIndex}
              onChange={(e) => setCurrentProjectIndex(Number(e.target.value))}
              className="bg-transparent text-white font-medium text-xs focus:outline-none pr-1 cursor-pointer"
            >
              {projects.map((p, idx) => (
                <option key={p.id} value={idx} className="bg-[#12100e] text-white">
                  {p.title} ({p.versions.length} v)
                </option>
              ))}
            </select>
          </div>

          {/* Quick Demo: Project B Button */}
          <button
            onClick={() =>
              handleCreateNewProject(
                'Clothing Brand Promo',
                'Create a promo for my new clothing brand.'
              )
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#fbf7ee] hover:bg-[#ede4d1] text-[#140e0b] text-xs font-semibold shadow-md shadow-[#9c4e1f]/10 transition"
            title="Demonstrate zero-reprompt memory recall across projects"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#140e0b] stroke-[2.5]" />
            <span>New Project (Demo)</span>
          </button>

          {/* Context Inspector */}
          {activeVersion && (
            <button
              onClick={() => setIsInspectorOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#140e0b] hover:bg-[#201712] border border-white/10 hover:border-[#c88d51]/30 text-xs font-medium text-[#cbbba8] transition"
              title="Inspect Enriched Brief & Memories"
            >
              <Info className="w-3.5 h-3.5 text-[#c88d51]" />
              <span className="hidden md:inline">Inspect Context</span>
            </button>
          )}

          {/* Memory Panel Drawer Trigger */}
          <button
            onClick={() => setIsMemoryPanelOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#18120e] hover:bg-[#241a14] border border-[#c88d51]/30 hover:border-[#c88d51]/60 text-[#f5f2eb] text-xs font-medium transition shadow-sm"
          >
            <span className="w-2 h-2 rounded-full bg-[#dda15e] animate-pulse" />
            <span className="font-mono text-[11px] text-[#dda15e]">Vault</span>
            <span className="px-1.5 py-0.2 rounded-full bg-[#c88d51]/20 border border-[#c88d51]/35 text-[#e6af72] font-mono text-[10px]">
              {activeMemories.length}
            </span>
          </button>
        </div>
      </header>

      {/* Persistent Memory Notification Banner */}
      {bannerNotice && (
        <div className="px-5 py-2 bg-[#140e0b]/95 border-b border-[#c88d51]/30 text-xs text-[#dda15e] flex items-center justify-between backdrop-blur-md">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <Zap className="w-3.5 h-3.5 text-[#e6af72] shrink-0" />
            <span>{bannerNotice}</span>
          </div>
          <button
            onClick={() => setBannerNotice(null)}
            className="text-[#ab9482] hover:text-white text-[10px] font-mono transition"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Workspace Grid */}
      <main className="flex-1 p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-hidden">
        {/* Left Column: Media Preview & Version Timeline (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex-1 min-h-[460px]">
            <MediaPreview
              version={activeVersion}
              allVersions={activeProject?.versions || []}
              selectedVersionIndex={activeProject?.currentVersionIndex || 0}
              onSelectVersion={(index) => {
                setProjects((prev) => {
                  const updated = [...prev];
                  updated[currentProjectIndex].currentVersionIndex = index;
                  return updated;
                });
              }}
              isLoading={isGenerating}
            />
          </div>

          {/* Pending Memory Confirmation Card */}
          {pendingPreferences.length > 0 && (
            <MemoryConfirmation
              detectedPreferences={pendingPreferences}
              onConfirmRemember={handleConfirmRemember}
              onDismiss={() => setPendingPreferences([])}
              isSaving={isSavingMemory}
            />
          )}
        </div>

        {/* Right Column: Agent Chat & Review Interface (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col h-[calc(100vh-175px)] min-h-[480px]">
          <AgentChat
            messages={messages}
            onSendMessage={handleSendMessage}
            onRegenerate={() => {
              if (activeProject.initialPrompt) {
                const nextV = activeProject.versions.length + 1;
                handleGenerate(activeProject.initialPrompt, nextV);
              }
            }}
            isLoading={isGenerating}
            onSelectSuggestion={(sugg) => {
              if (sugg.includes('clothing')) {
                handleCreateNewProject('Clothing Brand Promo', sugg);
              } else {
                handleSendMessage(sugg);
              }
            }}
          />
        </div>
      </main>

      {/* Footer bar */}
      <footer className="px-5 py-2.5 bg-[#0b0806] border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-[#786152]">
        <div className="flex items-center gap-2">
          <span className="text-[#ab9482] font-semibold">Nue Memory</span>
          <span>·</span>
          <span>A NextMathLabs company</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Feature: <span className="text-[#dda15e]">Media Memory</span></span>
          <span>·</span>
          <span>Livepeer Agent Hackathon</span>
          <span>·</span>
          <span>Walrus MemWal</span>
        </div>
      </footer>

      {/* Media Memory Drawer */}
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
