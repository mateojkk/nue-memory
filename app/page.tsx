'use client';

import React, { useState, useEffect } from 'react';
import { NueNavbar } from '@/components/NueNavbar';
import { HeroSection } from '@/components/landing/HeroSection';
import { QuickstartSection } from '@/components/landing/QuickstartSection';
import { DifferentiatorSection } from '@/components/landing/DifferentiatorSection';
import { LifecycleSection } from '@/components/landing/LifecycleSection';
import { MemoryObjectsSection } from '@/components/landing/MemoryObjectsSection';
import { EvolutionSection } from '@/components/landing/EvolutionSection';
import { MediaMemoryShowcase } from '@/components/landing/MediaMemoryShowcase';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { NueDashboard } from '@/components/dashboard/NueDashboard';
import { MemoryPanel } from '@/components/MemoryPanel';
import { EnrichedBriefModal } from '@/components/EnrichedBriefModal';
import {
  CreativeProject,
  MediaVersion,
  ChatMessage,
  MediaPreference,
} from '@/lib/types';

export default function Home() {
  const [currentView, setCurrentView] = useState<'landing' | 'dashboard'>('landing');

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
    feedbackContext?: string,
    overrideProjectIndex?: number,
    overrideProjectTitle?: string
  ) => {
    setIsGenerating(true);

    const targetIndex = overrideProjectIndex !== undefined ? overrideProjectIndex : currentProjectIndex;
    const targetTitle = overrideProjectTitle || projects[targetIndex]?.title || activeProject?.title || 'Media Project';

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: promptText,
          versionNumber,
          projectTitle: targetTitle,
          feedbackContext,
        }),
      });

      const data = await res.json();
      if (data.success && data.mediaVersion) {
        const newVersion: MediaVersion = data.mediaVersion;

        // Update Project with new Version
        setProjects((prev) => {
          const updated = [...prev];
          if (updated[targetIndex]) {
            const proj = { ...updated[targetIndex] };
            proj.versions = [...proj.versions, newVersion];
            proj.currentVersionIndex = proj.versions.length - 1;
            updated[targetIndex] = proj;
          }
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

    const newIndex = projects.length;
    setProjects((prev) => [...prev, newProj]);
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
    handleGenerate(prompt, 1, undefined, newIndex, title);
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

  if (currentView === 'dashboard') {
    return (
      <>
        <NueDashboard
          onBackToLanding={() => setCurrentView('landing')}
          activeProject={activeProject}
          activeVersion={activeVersion}
          allVersions={activeProject?.versions || []}
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
            if (activeProject?.initialPrompt) {
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
          onNewProject={(title, prompt) => handleCreateNewProject(title, prompt)}
          activeMemories={activeMemories}
          onOpenVault={() => setIsMemoryPanelOpen(true)}
          onOpenInspector={() => setIsInspectorOpen(true)}
          onForgetMemory={handleForgetMemory}
          projects={projects}
          currentProjectIndex={currentProjectIndex}
          onSelectProject={(index) => setCurrentProjectIndex(index)}
        />

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
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0a09] text-stone-200 font-light selection:bg-[#c88d51]/20 selection:text-white flex flex-col">
      {/* 1. Navbar */}
      <NueNavbar
        onOpenVault={() => setIsMemoryPanelOpen(true)}
        onGetStarted={() => setCurrentView('dashboard')}
        activeCount={activeMemories.filter((m) => m.isActive).length}
        currentView={currentView}
        onSwitchView={(v) => setCurrentView(v)}
      />

      {/* 2. Hero Section */}
      <HeroSection
        onGetStarted={() => setCurrentView('dashboard')}
        onViewDocs={() => setCurrentView('dashboard')}
      />

      {/* 3. Quickstart SDK Code Section */}
      <QuickstartSection />

      {/* 4. Core Differentiator: Memory vs Conversation Storage */}
      <DifferentiatorSection />

      {/* 5. 7-Stage Memory Lifecycle Architecture */}
      <LifecycleSection />

      {/* 6. Domain-Agnostic Memory Objects & Schema */}
      <MemoryObjectsSection />

      {/* 7. Memory Conflict & Evolution */}
      <EvolutionSection />

      {/* 8. Flagship Shipped Feature: Media Memory Showcase */}
      <MediaMemoryShowcase
        onOpenWorkspace={() => setCurrentView('dashboard')}
      />

      {/* 9. Landing Footer */}
      <LandingFooter
        onOpenWorkspace={() => setCurrentView('dashboard')}
        onOpenDocs={() => setCurrentView('dashboard')}
      />

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
