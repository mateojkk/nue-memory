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
  /** Active project id to open when view is 'dashboard'. */
  initialProjectId?: string;
}

export function NueApp({ view, initialTab, initialProjectId }: NueAppProps) {
  const router = useRouter();
  const currentView = view;
  const { ready, authenticated, email, deductCredits } = useAuth();

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
  const [activeNamespace, setActiveNamespace] = useState<string>('');
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

        // Restore active project from initialProjectId, URL param, or localStorage
        let targetId = initialProjectId;
        if (!targetId && typeof window !== 'undefined') {
          try {
            const urlParams = new URLSearchParams(window.location.search);
            targetId = urlParams.get('project') || localStorage.getItem('nue_active_project_id') || undefined;
          } catch {
            // Ignore
          }
        }

        let targetIndex = 0;
        if (targetId) {
          const foundIdx = data.projects.findIndex((p: CreativeProject) => p.id === targetId);
          if (foundIdx >= 0) targetIndex = foundIdx;
        }
        setCurrentProjectIndex(targetIndex);
        if (data.projects[targetIndex]?.messages && data.projects[targetIndex].messages.length > 0) {
          setMessages(data.projects[targetIndex].messages);
        }
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

  // Load memories directly from MemWal on Walrus for the current user's namespace
  useEffect(() => {
    if (email) {
      fetchMemories(email);
    } else {
      setActiveMemories([]);
      setActiveNamespace('');
    }
  }, [email]);

  const fetchMemories = async (userEmail: string) => {
    try {
      const url = `/api/memwal?email=${encodeURIComponent(userEmail)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.preferences)) {
        setActiveMemories(data.preferences);
      }
      if (data.namespace) {
        setActiveNamespace(data.namespace);
      }
    } catch (e) {
      console.warn('Failed to load memories from MemWal:', e);
    }
  };

  // Generate Media via Livepeer Agent
  const handleGenerate = async (
    promptText: string,
    versionNumber = 1,
    feedbackContext?: string,
    overrideProjectIndex?: number,
    overrideProjectTitle?: string,
    imageUrl?: string
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
          email: email || undefined,
          userId: email || undefined,
          imageUrl: imageUrl || undefined,
        }),
      });

      const data = await res.json();
      if (data.success && data.mediaVersion) {
        const newVersion: MediaVersion = data.mediaVersion;

        // Deduct compute cost ($0.05) from user profile in Supabase
        deductCredits?.(0.05);

        // Build agent response - use LLM director message when available
        const dur = newVersion.generationDurationSeconds || 5;
        const cap = newVersion.livepeerCapability || 'pixverse-t2v';
        const durationNotice = ` (${dur}s clip on ${cap})`;

        const audioNotice = newVersion.audioStyle?.audioUrl
          ? `\n\n🎵 Synchronized with Livepeer AI soundtrack: ${newVersion.audioStyle.style}.`
          : '';

        const agentContent = data.directorMessage
          ? `${data.directorMessage}${durationNotice}${audioNotice}`
          : `I have generated Version ${newVersion.versionNumber}${durationNotice} with ${newVersion.pacing} pacing and ${newVersion.audioStyle.style}.${audioNotice}`;

        const agentMsg: ChatMessage = {
          id: `msg-${Date.now()}`,
          sender: 'agent',
          content: agentContent,
          timestamp: new Date().toISOString(),
          versionNumber: newVersion.versionNumber,
        };

        // Update Project with new Version and Agent message, then persist directly to Supabase DB
        setProjects((prev) => {
          const updated = [...prev];
          if (updated[targetIndex]) {
            const proj = { ...updated[targetIndex] };
            proj.versions = [...proj.versions, newVersion];
            proj.currentVersionIndex = proj.versions.length - 1;
            proj.messages = [...(proj.messages || []), agentMsg];
            updated[targetIndex] = proj;
            persistProjectToDb(proj);
          }
          return updated;
        });

        setMessages((prev) => [...prev, agentMsg]);
      } else {
        // API returned an error - show it to the user
        const errorMsg: ChatMessage = {
          id: `msg-err-${Date.now()}`,
          sender: 'agent',
          content: `Sorry, generation failed: ${data.error || 'Unknown error'}. Please try again.`,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        console.error('[AppShell] Generate API error:', data.error);
      }
    } catch (err) {
      console.error('Generation error:', err);
      const errorMsg: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        sender: 'agent',
        content: `Sorry, something went wrong: ${err instanceof Error ? err.message : 'Network error'}. Please try again.`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle User Message / Feedback
  const handleSendMessage = async (text: string, imageUrl?: string) => {
    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      content: text,
      timestamp: new Date().toISOString(),
      ...(imageUrl ? { imageUrl } : {}),
    };
    setMessages((prev) => [...prev, userMsg]);

    let currentProj = activeProject;
    let targetIndex = currentProjectIndex;

    // If there is no active project yet, create Project 1
    if (!currentProj) {
      const generatedTitle = text.length > 25 ? `${text.slice(0, 25).trim()}...` : text;
      const newProj: CreativeProject = {
        id: `proj-${Date.now()}`,
        title: generatedTitle,
        initialPrompt: text,
        createdAt: new Date().toISOString(),
        currentVersionIndex: 0,
        versions: [],
        messages: [userMsg],
      };
      setProjects([newProj]);
      setCurrentProjectIndex(0);
      persistProjectToDb(newProj);
      await handleGenerate(text, 1, undefined, 0, newProj.title, imageUrl);
      return;
    }

    // Persist the user message into the current project directly in Supabase DB immediately
    setProjects((prev) => {
      const updated = [...prev];
      if (updated[targetIndex]) {
        const proj = { ...updated[targetIndex] };
        proj.messages = [...(proj.messages || []), userMsg];
        updated[targetIndex] = proj;
        persistProjectToDb(proj);
      }
      return updated;
    });

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
      await handleGenerate(text, 1, undefined, targetIndex, currentProj.title, imageUrl);
      return;
    }

    // Otherwise, this is review feedback on the current version
    // Memory recall and preference saving are handled automatically by
    // withMemWal inside the /api/generate route (Groq LLM + MemWal AI SDK)
    const nextVersionNumber = currentProj.versions.length + 1;
    await handleGenerate(
      currentProj.initialPrompt,
      nextVersionNumber,
      text,
      targetIndex,
      currentProj.title,
      imageUrl
    );
  };

  // Confirm and persist remembered preferences to Walrus via MemWal
  const handleConfirmRemember = async () => {
    if (pendingPreferences.length === 0) return;
    setIsSavingMemory(true);

    try {
      const res = await fetch('/api/memwal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remember',
          preferences: pendingPreferences,
          email: email || undefined,
          userId: email || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const getUrl = email ? `/api/memwal?email=${encodeURIComponent(email)}` : '/api/memwal';
        const getRes = await fetch(getUrl);
        const getData = await getRes.json();
        if (getData.success && getData.preferences) {
          setActiveMemories(getData.preferences);
        }

        const blobSummary = data.blobIds?.length ? ` (Blob: ${data.blobIds[0]})` : '';
        const memSavedMsg: ChatMessage = {
          id: `msg-saved-${Date.now()}`,
          sender: 'agent',
          content: `✨ Saved ${pendingPreferences.length} preference(s) to persistent memory${blobSummary}. These will automatically persist and enrich all future agent generations.`,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, memSavedMsg]);
        setProjects((prev) => {
          const updated = [...prev];
          if (updated[currentProjectIndex]) {
            const proj = { ...updated[currentProjectIndex] };
            proj.messages = [...(proj.messages || []), memSavedMsg];
            updated[currentProjectIndex] = proj;
            persistProjectToDb(proj);
          }
          return updated;
        });
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
    const initMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'agent',
      content: `Created new project: "${projectTitle}".\nEnter a creative prompt below to generate your first media version with persistent memory recall.`,
      timestamp: new Date().toISOString(),
    };
    const newProj: CreativeProject = {
      id: `proj-${Date.now()}`,
      title: projectTitle,
      initialPrompt,
      createdAt: new Date().toISOString(),
      currentVersionIndex: 0,
      versions: [],
      messages: [initMsg],
    };

    const newIndex = projects.length;
    setProjects((prev) => [...prev, newProj]);
    setCurrentProjectIndex(newIndex);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('nue_active_project_id', newProj.id);
        const url = new URL(window.location.href);
        url.searchParams.set('project', newProj.id);
        window.history.replaceState(null, '', url.toString());
      } catch {
        // Ignore
      }
    }
    setPendingPreferences([]);
    persistProjectToDb(newProj);
    setMessages([initMsg]);

    if (initialPrompt) {
      handleGenerate(initialPrompt, 1, undefined, newIndex, projectTitle);
    }
  };

  // Select Project with persistence
  const handleSelectProject = (index: number) => {
    setCurrentProjectIndex(index);
    const selected = projects[index];
    if (selected) {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('nue_active_project_id', selected.id);
          const url = new URL(window.location.href);
          if (url.searchParams.get('project') !== selected.id) {
            url.searchParams.set('project', selected.id);
            window.history.replaceState(null, '', url.toString());
          }
        } catch {
          // Ignore
        }
      }
      if (selected.messages && selected.messages.length > 0) {
        setMessages(selected.messages);
      } else {
        const defaultMsg: ChatMessage = {
          id: `msg-sel-${Date.now()}`,
          sender: 'agent',
          content: `Loaded "${selected.title}". Ready for your creative instructions.`,
          timestamp: new Date().toISOString(),
        };
        setMessages([defaultMsg]);
      }
    }
  };

  // Rename Project
  const handleRenameProject = (projectId: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    setProjects((prev) => {
      const updated = prev.map((p) => (p.id === projectId ? { ...p, title: trimmed } : p));
      const targetProj = updated.find((p) => p.id === projectId);
      if (targetProj) {
        persistProjectToDb(targetProj);
      }
      return updated;
    });
  };

  // Delete Project
  const handleDeleteProject = async (projectId: string) => {
    try {
      if (email) {
        await fetch(`/api/projects?id=${encodeURIComponent(projectId)}&email=${encodeURIComponent(email)}`, {
          method: 'DELETE',
        });
      }
    } catch (e) {
      console.warn('Failed to delete project from DB:', e);
    }

    const remaining = projects.filter((p) => p.id !== projectId);
    setProjects(remaining);

    const nextIdx = Math.max(0, Math.min(currentProjectIndex, remaining.length - 1));
    setCurrentProjectIndex(nextIdx);

    if (typeof window !== 'undefined') {
      try {
        if (remaining[nextIdx]) {
          localStorage.setItem('nue_active_project_id', remaining[nextIdx].id);
          const url = new URL(window.location.href);
          url.searchParams.set('project', remaining[nextIdx].id);
          window.history.replaceState(null, '', url.toString());
        } else {
          localStorage.removeItem('nue_active_project_id');
          const url = new URL(window.location.href);
          url.searchParams.delete('project');
          window.history.replaceState(null, '', url.toString());
        }
      } catch {
        // Ignore
      }
    }

    setPendingPreferences([]);
    setMessages((prev) => [
      ...prev,
      {
        id: `msg-delete-${Date.now()}`,
        sender: 'agent',
        content: 'Project deleted. Your persistent memories on Walrus remain intact.',
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  // Reset Project (clears generated versions and chat while preserving project and memory in DB)
  const handleResetProject = (projectId: string) => {
    const resetMsg: ChatMessage = {
      id: `msg-reset-${Date.now()}`,
      sender: 'agent',
      content: 'Project reset. Generated media versions have been cleared. Ready for your next creative prompt.',
      timestamp: new Date().toISOString(),
    };

    setProjects((prev) => {
      const updated = prev.map((p) => {
        if (p.id === projectId) {
          const resetProj: CreativeProject = {
            ...p,
            currentVersionIndex: 0,
            versions: [],
            messages: [resetMsg],
          };
          persistProjectToDb(resetProj);
          return resetProj;
        }
        return p;
      });
      return updated;
    });

    setPendingPreferences([]);
    setMessages([resetMsg]);
  };

  // Forget memory
  const handleForgetMemory = async (id: string) => {
    try {
      await fetch('/api/memwal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'forget',
          id,
          email: email || undefined,
          userId: email || undefined,
        }),
      });
      setActiveMemories((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      console.error('Failed to forget memory:', e);
    }
  };

  if (currentView === 'dashboard') {
    return (
      <>
        {!authenticated && ready && <AuthGuardModal isOpen={true} />}
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
          onRenameProject={handleRenameProject}
          onDeleteProject={handleDeleteProject}
          onResetProject={handleResetProject}
          activeMemories={activeMemories}
          onForgetMemory={handleForgetMemory}
          projects={projects}
          currentProjectIndex={currentProjectIndex}
          onSelectProject={handleSelectProject}
          userNamespace={activeNamespace}
          userEmail={email || undefined}
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
