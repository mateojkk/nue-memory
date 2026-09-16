'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** mem0-style expandable announcement bar ("Introducing …") above the navbar. */
function AnnouncementBar() {
  const [open, setOpen] = useState(true);
  const [render, setRender] = useState(true);

  if (!render) return null;

  return (
    <div
      className="overflow-hidden bg-[var(--surface-2)] border-b border-[var(--border)]"
      style={{
        maxHeight: open ? 44 : 0,
        opacity: open ? 1 : 0.001,
        transition:
          'max-height 350ms cubic-bezier(0.12, 0.23, 0.5, 1), opacity 350ms cubic-bezier(0.12, 0.23, 0.5, 1)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 h-11 flex items-center justify-center gap-2 text-xs font-mono text-[var(--fg-muted)]">
        <span className="text-[var(--accent)]">●</span>
        <span>
          Persistent memory infrastructure for AI agents. Introducing Nue Motion with $10 free credit.
        </span>
        <button
          onClick={() => {
            setOpen(false);
            window.setTimeout(() => setRender(false), 380);
          }}
          aria-label="Dismiss announcement"
          className="ml-2 text-[var(--fg-faint)] hover:text-[var(--fg)] transition text-sm leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}
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
import type { DashboardTab } from '@/components/dashboard/NueDashboard';
import { useAuth } from '@/components/auth/useAuth';
import { AuthGuardModal } from '@/components/auth/AuthGuardModal';
import {
  CreativeProject,
  MediaVersion,
  ChatMessage,
  MediaPreference,
} from '@/lib/types';

export interface NueAppProps {
  /** Which surface this route renders. The two routes are separate: /landing and /motion. */
  view: 'landing' | 'dashboard';
  /** Dashboard tab to open when view is 'dashboard'. */
  initialTab?: DashboardTab;
}

export function NueApp({ view, initialTab }: NueAppProps) {
  const router = useRouter();
  const currentView = view;
  const { authenticated, email, deductCredits } = useAuth();

  // Projects State (Saved and retrieved from Supabase DB)
  const [projects, setProjects] = useState<CreativeProject[]>([]);
  const [currentProjectIndex, setCurrentProjectIndex] = useState(0);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'agent',
      content:
        'Welcome to Creative Studio. I adapt to your style as we collaborate.\n\nEnter a creative prompt or select a suggestion below to start.',
      timestamp: new Date().toISOString(),
    },
  ]);

  // Memory & Confirmation State
  const [activeMemories, setActiveMemories] = useState<MediaPreference[]>([]);
  const [pendingPreferences, setPendingPreferences] = useState<
    Omit<MediaPreference, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>[]
  >([]);

  // Loading States
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingMemory, setIsSavingMemory] = useState(false);

  const activeProject = projects[currentProjectIndex] || null;
  const activeVersion =
    activeProject && activeProject.versions?.length > 0
      ? activeProject.versions[activeProject.currentVersionIndex]
      : null;

  // Load user projects from Supabase database
  useEffect(() => {
    if (email) {
      loadProjects(email);
    }
  }, [email]);

  const loadProjects = async (userEmail: string) => {
    try {
      const res = await fetch(`/api/projects?email=${encodeURIComponent(userEmail)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.projects) && data.projects.length > 0) {
        setProjects(data.projects);
      }
    } catch (e) {
      console.warn('Failed to load user projects from DB:', e);
    }
  };

  const persistProjectToDb = async (proj: CreativeProject) => {
    if (!email) return;
    try {
      await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, project: proj }),
      });
    } catch (e) {
      console.warn('Failed to persist project to DB:', e);
    }
  };

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
            persistProjectToDb(proj);
          }
          return updated;
        });

        // Deduct compute cost ($0.05) from user profile in Supabase
        deductCredits?.(0.05);

        // Add Agent Response message
        const appliedCount = newVersion.appliedPreferences.length;
        const memoryDetails =
          appliedCount > 0
            ? `\n\n✨ Automatically applied ${appliedCount} remembered preference(s) from Nue Memory.`
            : '';

        const durationNotice = newVersion.generationDurationSeconds
          ? ` (${newVersion.generationDurationSeconds}s clip on ${newVersion.livepeerCapability || 'Livepeer'})`
          : '';

        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            sender: 'agent',
            content: `I have generated Version ${newVersion.versionNumber}${durationNotice} with ${newVersion.pacing} pacing, ${newVersion.captionStyle.size} captions, and ${newVersion.audioStyle.style}.${memoryDetails}`,
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

    let currentProj = activeProject;
    let targetIndex = currentProjectIndex;

    // If there is no active project yet, create Project 1
    if (!currentProj) {
      const generatedTitle = text.length > 25 ? `${text.slice(0, 25).trim()}…` : text;
      const newProj: CreativeProject = {
        id: `proj-${Date.now()}`,
        title: generatedTitle,
        initialPrompt: text,
        createdAt: new Date().toISOString(),
        currentVersionIndex: 0,
        versions: [],
      };
      setProjects([newProj]);
      setCurrentProjectIndex(0);
      currentProj = newProj;
      targetIndex = 0;
      await handleGenerate(text, 1, undefined, 0, newProj.title);
      return;
    }

    // If project has no versions yet, this is the first generation
    if (currentProj.versions.length === 0) {
      if (!currentProj.initialPrompt) {
        setProjects((prev) => {
          const updated = [...prev];
          if (updated[targetIndex]) {
            updated[targetIndex] = { ...updated[targetIndex], initialPrompt: text };
          }
          return updated;
        });
      }
      await handleGenerate(text, 1, undefined, targetIndex, currentProj.title);
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
          projectTitle: currentProj.title,
          currentBrief: currentProj.initialPrompt,
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
      const nextVersionNumber = currentProj.versions.length + 1;
      await handleGenerate(
        currentProj.initialPrompt,
        nextVersionNumber,
        text,
        targetIndex,
        currentProj.title
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
          setActiveMemories(getData.preferences);
        }

        const blobSummary = data.blobIds?.length ? ` (Blob: ${data.blobIds[0]})` : '';
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-saved-${Date.now()}`,
            sender: 'agent',
            content: `✨ Saved ${pendingPreferences.length} preference(s) to persistent memory${blobSummary}. These will automatically persist and enrich all future agent generations.`,
            timestamp: new Date().toISOString(),
          },
        ]);
      }

      setPendingPreferences([]);
    } catch (e) {
      console.error('Failed to save to Walrus:', e);
    } finally {
      setIsSavingMemory(false);
    }
  };

  // Create New Project
  const handleCreateNewProject = (
    title?: string,
    prompt?: string
  ) => {
    const projectTitle = title?.trim() || `Project ${projects.length + 1}`;
    const initialPrompt = prompt?.trim() || '';
    const newProj: CreativeProject = {
      id: `proj-${Date.now()}`,
      title: projectTitle,
      initialPrompt,
      createdAt: new Date().toISOString(),
      currentVersionIndex: 0,
      versions: [],
    };

    const newIndex = projects.length;
    setProjects((prev) => [...prev, newProj]);
    setCurrentProjectIndex(newIndex);
    setPendingPreferences([]);
    persistProjectToDb(newProj);

    setMessages([
      {
        id: `msg-${Date.now()}`,
        sender: 'agent',
        content: `Created new project: "${projectTitle}".\nEnter a creative prompt below to generate your first media version with persistent memory recall.`,
        timestamp: new Date().toISOString(),
      },
    ]);

    if (initialPrompt) {
      handleGenerate(initialPrompt, 1, undefined, newIndex, projectTitle);
    }
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
        {!authenticated && <AuthGuardModal isOpen={true} />}
        <NueDashboard
          initialTab={initialTab}
          activeProject={activeProject}
          activeVersion={activeVersion}
          allVersions={activeProject?.versions || []}
          onSelectVersion={(index) => {
            setProjects((prev) => {
              const updated = [...prev];
              updated[currentProjectIndex] = {
                ...updated[currentProjectIndex],
                currentVersionIndex: index,
              };
              return updated;
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
          onDismissPending={() => {
            setPendingPreferences([]);
            setMessages((prev) => [
              ...prev,
              {
                id: `msg-dismiss-${Date.now()}`,
                sender: 'agent',
                content: 'Noted. These adjustments will apply to this project only and will not be saved to your persistent memory.',
                timestamp: new Date().toISOString(),
              },
            ]);
          }}
          isSavingMemory={isSavingMemory}
          onNewProject={(title, prompt) => handleCreateNewProject(title, prompt)}
          activeMemories={activeMemories}
          onForgetMemory={handleForgetMemory}
          projects={projects}
          currentProjectIndex={currentProjectIndex}
          onSelectProject={(index) => setCurrentProjectIndex(index)}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] font-light selection:bg-[var(--accent)]/20 selection:text-[var(--fg)] flex flex-col">
      <AnnouncementBar />

      {/* 1. Navbar */}
      <NueNavbar />

      {/* 2. Hero Section */}
      <HeroSection
        onGetStarted={() => router.push('/motion')}
        onViewDocs={() => {
          document.getElementById('docs')?.scrollIntoView({ behavior: 'smooth' });
        }}
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
        onOpenWorkspace={() => router.push('/motion')}
      />

      {/* 9. Landing Footer */}
      <LandingFooter
        onOpenWorkspace={() => router.push('/motion')}
        onOpenDocs={() => {
          document.getElementById('docs')?.scrollIntoView({ behavior: 'smooth' });
        }}
      />
    </div>
  );
}
