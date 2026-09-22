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
      className="overflow-hidden bg-[var(--surface-2)]"
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
          Nue Motion remembers your style across every video · $10 free credit to start.
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
import { DifferentiatorSection } from '@/components/landing/DifferentiatorSection';
import { NueMotionShowcase } from '@/components/landing/NueMotionShowcase';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { NueDashboard, type DashboardTab } from '@/components/dashboard/NueDashboard';
import { useAuth } from '@/components/auth/useAuth';
import { AuthGuardModal } from '@/components/auth/AuthGuardModal';
import { humanizeUpstreamError } from '@/lib/ai/nue-director';
import {
  CreativeProject,
  MediaVersion,
  ChatMessage,
  MotionPreference,
} from '@/lib/types';

export interface NueAppProps {
  /** Which surface this route renders. The two routes are separate: /landing and /motion. */
  view: 'landing' | 'dashboard';
  /** Dashboard tab to open when view is 'dashboard'. */
  initialTab?: DashboardTab;
  /** Active project id to open when view is 'dashboard'. */
  initialProjectId?: string;
}

interface PendingRenderPreflight {
  promptText: string;
  versionNumber: number;
  feedbackContext?: string;
  overrideProjectIndex?: number;
  overrideProjectTitle?: string;
  imageUrl?: string;
  chatHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  directorBrief: any;
  plan: {
    duration: number;
    sceneCount: number;
    model: string;
    aspectRatio: string;
    audioEnabled: boolean;
    hasVocals: boolean;
    lyricsPrompt?: string;
    audioStyle?: string;
    visualTheme?: string;
    pacing?: string;
    scenePrompts?: string[];
    timelineNote?: string;
    recalledMemories?: Array<{ category: string; preference: string }>;
    agentMessage?: string;
  };
}

const ACTIONABLE_MEMORY_CATEGORIES = new Set([
  'visual_style',
  'audio',
  'music',
  'voice',
  'pacing',
  'typography',
  'captions',
  'color',
  'transitions',
  'aspect_ratio',
  'layout',
  'duration',
  'model',
  'branding',
  'composition',
]);

function isActionableMemory(memory: MotionPreference): boolean {
  const preference = memory.preference?.trim();
  if (!preference) return false;

  const category = String(memory.category || '').toLowerCase();
  const lower = preference.toLowerCase();

  if (category === 'general') return false;
  if (!ACTIONABLE_MEMORY_CATEGORIES.has(category)) return false;
  if (lower.length < 8) return false;

  // Prompt-specific instructions are not durable taste. They can remain in
  // Walrus history, but should not be presented as active creative memory.
  if (/\b(user requested|user specified|the video should|should include|for ages|copyright|watermark|logos?|subtitles?|recognizable|imitate|resemble|nursery rhyme)\b/i.test(lower)) {
    return false;
  }

  return true;
}

function curateMemories(memories: MotionPreference[]): MotionPreference[] {
  const byKey = new Map<string, MotionPreference>();
  for (const memory of memories) {
    if (!isActionableMemory(memory)) continue;
    const key = `${String(memory.category).toLowerCase()}:${memory.preference.trim().toLowerCase()}`;
    const existing = byKey.get(key);
    if (!existing || new Date(memory.updatedAt || memory.createdAt).getTime() > new Date(existing.updatedAt || existing.createdAt).getTime()) {
      byKey.set(key, memory);
    }
  }
  return Array.from(byKey.values()).sort(
    (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
  );
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
  const [activeMemories, setActiveMemories] = useState<MotionPreference[]>([]);
  const [isLoadingMemories, setIsLoadingMemories] = useState(false);
  const [activeNamespace, setActiveNamespace] = useState<string>('');
  const [pendingPreferences, setPendingPreferences] = useState<
    Omit<MotionPreference, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>[]
  >([]);
  const [pendingPreflight, setPendingPreflight] = useState<PendingRenderPreflight | null>(null);

  // Loading States
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState<'thinking' | 'cooking' | null>(null);
  const [generationElapsedSeconds, setGenerationElapsedSeconds] = useState(0);
  const [serverProgress, setServerProgress] = useState<number | undefined>(undefined);
  const [serverStageDescription, setServerStageDescription] = useState<string | undefined>(undefined);
  const [serverModel, setServerModel] = useState<string | undefined>(undefined);
  const [serverExpectedSla, setServerExpectedSla] = useState<string | undefined>(undefined);
  const [isSavingMemory, setIsSavingMemory] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isGenerating) {
      setGenerationElapsedSeconds(0);
      interval = setInterval(() => {
        setGenerationElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setGenerationElapsedSeconds(0);
      setServerProgress(undefined);
      setServerStageDescription(undefined);
      setServerModel(undefined);
      setServerExpectedSla(undefined);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isGenerating]);

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

  const loadProjects = async (userEmail: string, preferredProjectId?: string) => {
    try {
      const res = await fetch(`/api/projects?email=${encodeURIComponent(userEmail)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.projects) && data.projects.length > 0) {
        setProjects(data.projects);

        // Restore active project from preferredProjectId, activeProject, initialProjectId, URL param, or localStorage
        let targetId = preferredProjectId || activeProject?.id || initialProjectId;
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

  const proposeMemoriesFromFeedback = async (feedback: string, project: CreativeProject | null): Promise<number> => {
    if (!feedback.trim()) return 0;
    try {
      const res = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedback,
          projectTitle: project?.title,
          currentBrief:
            project?.versions?.[project.currentVersionIndex]?.brief ||
            project?.initialPrompt ||
            '',
          email: email || undefined,
          userId: email || undefined,
          // Mem0-style dedupe context: active rules so repeats aren't re-extracted.
          existingMemories: activeMemories.map((m) => ({ category: m.category, preference: m.preference })),
        }),
      });
      if (!res.ok) return 0;
      const data = await res.json();
      const extracted = data?.classification?.extractedPreferences;
      if (!Array.isArray(extracted) || extracted.length === 0) return 0;

      // Compute synchronously against the current snapshot (state updaters run
      // async, so the count cannot be derived inside setPendingPreferences).
      const existingKeys = new Set([
        ...pendingPreferences.map((p) => `${p.category}:${p.preference}`.toLowerCase()),
        ...activeMemories.map((p) => `${p.category}:${p.preference}`.toLowerCase()),
      ]);
      const next = extracted
        .map((pref: Omit<MotionPreference, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>) => ({
          ...pref,
          projectId: project?.id,
          projectTitle: project?.title || pref.projectTitle,
          userId: email || pref.userId,
        }))
        .filter((pref: Omit<MotionPreference, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>) => {
          const key = `${pref.category}:${pref.preference}`.toLowerCase();
          if (existingKeys.has(key)) return false;
          existingKeys.add(key);
          return true;
        });
      if (next.length > 0) {
        setPendingPreferences((prev) => [...prev, ...next].slice(-6));
      }
      return next.length;
    } catch (e) {
      console.warn('Failed to classify feedback for memory:', e);
      return 0;
    }
  };

  // Mem0-style auto-save: an explicit standing preference is self-confirming,
  // so it persists immediately (toast + undo in the Memory tab) instead of
  // waiting on a Remember click. Returns the saved preference texts.
  const rememberNow = async (text: string, project: CreativeProject | null): Promise<string[]> => {
    if (!text.trim()) return [];
    setIsSavingMemory(true);
    try {
      const res = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedback: text,
          projectTitle: project?.title,
          currentBrief:
            project?.versions?.[project.currentVersionIndex]?.brief ||
            project?.initialPrompt ||
            '',
          email: email || undefined,
          userId: email || undefined,
          existingMemories: activeMemories.map((m) => ({ category: m.category, preference: m.preference })),
        }),
      });
      if (!res.ok) return [];
      const data = await res.json();
      const extracted = data?.classification?.extractedPreferences;
      if (!Array.isArray(extracted) || extracted.length === 0) return [];

      const existingKeys = new Set(
        activeMemories.map((p) => `${p.category}:${p.preference}`.toLowerCase())
      );
      const fresh = extracted
        .map((pref: Omit<MotionPreference, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>) => ({
          ...pref,
          projectId: project?.id,
          projectTitle: project?.title || pref.projectTitle,
          userId: email || pref.userId,
        }))
        .filter((pref: Omit<MotionPreference, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>) => {
          const key = `${pref.category}:${pref.preference}`.toLowerCase();
          if (existingKeys.has(key)) return false;
          existingKeys.add(key);
          return true;
        });
      if (fresh.length === 0) return [];

      const saveRes = await fetch('/api/memwal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remember',
          preferences: fresh,
          email: email || undefined,
          userId: email || undefined,
        }),
      });
      const saveData = await saveRes.json().catch(() => null);
      if (!saveRes.ok || !saveData?.success) return [];

      if (email) await fetchMemories(email);
      else {
        const stored: MotionPreference[] = (saveData.storedPreferences || []).map((p: any, i: number) => ({
          ...fresh[i],
          ...p,
          isActive: true,
        }));
        setActiveMemories((prev) => [...prev, ...stored]);
      }
      return fresh.map((p: { preference: string }) => p.preference);
    } catch (e) {
      console.warn('Failed to auto-save memory:', e);
      return [];
    } finally {
      setIsSavingMemory(false);
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
    setIsLoadingMemories(true);
    try {
      const url = `/api/memwal?email=${encodeURIComponent(userEmail)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.preferences)) {
        setActiveMemories(curateMemories(data.preferences));
      }
      if (data.namespace) {
        setActiveNamespace(data.namespace);
      }
    } catch (e) {
      console.warn('Failed to load memories from MemWal:', e);
    } finally {
      setIsLoadingMemories(false);
    }
  };

  // Generate Media via Livepeer Agent
  const handleGenerate = async (
    promptText: string,
    versionNumber = 1,
    feedbackContext?: string,
    overrideProjectIndex?: number,
    overrideProjectTitle?: string,
    imageUrl?: string,
    chatHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: { bypassPreflight?: boolean; approvedDirectorBrief?: any; applyRecalledMemories?: boolean }
  ) => {
    setIsGenerating(true);
    setGenerationStage('thinking');

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
          chatHistory,
          email: email || undefined,
          userId: email || undefined,
          imageUrl: imageUrl || undefined,
          preflightOnly: !options?.bypassPreflight,
          approvedDirectorBrief: options?.approvedDirectorBrief,
          applyRecalledMemories: Boolean(options?.applyRecalledMemories),
        }),
      });

      const responseText = await res.text();
      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch {
        console.error('[AppShell] Non-JSON response from /api/generate:', responseText);
        if (
          res.status === 504 ||
          responseText.includes('504') ||
          responseText.includes('Gateway Time-out') ||
          responseText.includes('timed out')
        ) {
          throw new Error('Video generation timed out. Please try again with a shorter take or fewer scenes.');
        }
        throw new Error(
          res.status >= 400
            ? `Server error (${res.status}). Please try again.`
            : 'Received unexpected response format from server.'
        );
      }

      // Handle conversational response directly (no video rendering needed)
      if (data.success && data.status === 'completed' && data.result) {
        data = { success: true, ...data.result };
      }
      else if (data.success && data.preflight && data.directorBrief && data.plan) {
        setPendingPreflight({
          promptText,
          versionNumber,
          feedbackContext,
          overrideProjectIndex,
          overrideProjectTitle,
          imageUrl,
          chatHistory,
          directorBrief: data.directorBrief,
          plan: data.plan,
        });
        return;
      }
      // Asynchronous Job Polling Architecture
      else if (data.success && data.jobId) {
        const jobId = data.jobId;
        const livepeerJobId = data.livepeerJobId;
        const scene2JobId = data.scene2JobId;
        const audioJobId = data.audioJobId;
        const pollIntervalMs = 3000;
        const maxPollAttempts = 300; // 300 * 3s = 900s (15 min window for Seedance takes)
        let completedResult: any = null;

        // Only now (confirmed GPU job) do we transition to the cooking stage
        setGenerationStage('cooking');

        if (data.stageDescription) {
          setServerStageDescription(data.stageDescription);
        }
        if (data.progress !== undefined) {
          setServerProgress(data.progress);
        }
        if (data.model) {
          setServerModel(data.model);
        }
        if (data.expectedSla) {
          setServerExpectedSla(data.expectedSla);
        }

        for (let attempt = 0; attempt < maxPollAttempts; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
          try {
            const pollUrl =
              `/api/generate?jobId=${encodeURIComponent(jobId)}` +
              (livepeerJobId ? `&livepeerJobId=${encodeURIComponent(livepeerJobId)}` : '') +
              (scene2JobId ? `&scene2JobId=${encodeURIComponent(scene2JobId)}` : '') +
              (audioJobId ? `&audioJobId=${encodeURIComponent(audioJobId)}` : '');

            const pollRes = await fetch(pollUrl);
            if (pollRes.ok) {
              const pollData = await pollRes.json();
              if (pollData.success && pollData.job) {
                const job = pollData.job;
                if (job.status === 'completed') {
                  completedResult = job.result;
                  break;
                }
                if (job.status === 'failed') {
                  throw new Error(job.error || 'Video generation failed.');
                }
                if (job.stageDescription) {
                  setServerStageDescription(job.stageDescription);
                }
                if (job.progress !== undefined) {
                  setServerProgress(job.progress);
                }
                if (job.model) {
                  setServerModel(job.model);
                }
                if (job.expectedSla) {
                  setServerExpectedSla(job.expectedSla);
                }
              }
            }
          } catch (pollErr: any) {
            if (pollErr.message && !pollErr.message.includes('fetch')) {
              throw pollErr;
            }
          }
        }

        if (!completedResult) {
          throw new Error('Video generation took longer than expected due to remote GPU queue congestion. Please check your gallery in a moment.');
        }

        data = { success: true, ...completedResult };
      }

      if (data.success && data.mediaVersion) {
        const newVersion: MediaVersion = data.mediaVersion;

        // Deduct compute cost ($0.05) from user profile in Supabase
        deductCredits?.(0.05);

        // Re-sync durable memories only. Render traces are shown on the video card but are not memory.
        if (email) {
          fetchMemories(email);
        }

        // Build agent response truthfully
        const dur = newVersion.generationDurationSeconds || 15;
        const cap = newVersion.livepeerCapability || 'seedance-25-t2v';
        const audioNotice = newVersion.audioStyle?.audioUrl
          ? `\n\n🎵 Soundtrack: ${newVersion.audioStyle.style}.`
          : '';

        let agentContent = data.directorMessage || `Here's Version ${newVersion.versionNumber}!`;
        if (audioNotice && !agentContent.includes('Soundtrack:')) {
          agentContent = `${agentContent}${audioNotice}`;
        }

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
      } else if (data.success && data.directorMessage) {
        // Conversational agent reply (greeting, clarification) without GPU render
        const agentMsg: ChatMessage = {
          id: `msg-${Date.now()}`,
          sender: 'agent',
          content: data.directorMessage,
          timestamp: new Date().toISOString(),
        };

        // Server-side memory-intent backstop: the director distilled a standing
        // preference instead of rendering. Surface it in the same Remember UI.
        const pm = data.pendingMemory;
        if (pm && typeof pm.preference === 'string' && pm.preference.trim().length > 0) {
          const candidate = {
            type: 'media_preference' as const,
            category: typeof pm.category === 'string' && pm.category ? pm.category : 'visual_style',
            preference: pm.preference.trim(),
            strength: 'high' as const,
            scope: 'media' as const,
            source: 'user_feedback' as const,
            projectId: activeProject?.id,
            projectTitle: activeProject?.title,
            userId: email || undefined,
          };
          const key = `${candidate.category}:${candidate.preference}`.toLowerCase();
          const already = [...pendingPreferences, ...activeMemories].some(
            (p) => `${p.category}:${p.preference}`.toLowerCase() === key
          );
          if (!already) {
            setPendingPreferences((prev) => [...prev, candidate].slice(-6));
          }
        }

        setProjects((prev) => {
          const updated = [...prev];
          if (updated[targetIndex]) {
            const proj = { ...updated[targetIndex] };
            proj.messages = [...(proj.messages || []), agentMsg];
            updated[targetIndex] = proj;
            persistProjectToDb(proj);
          }
          return updated;
        });

        setMessages((prev) => [...prev, agentMsg]);
      } else {
        // API returned an error - humanize and show to the user
        const friendlyError = humanizeUpstreamError(data?.error || 'Unknown error');
        const errorMsg: ChatMessage = {
          id: `msg-err-${Date.now()}`,
          sender: 'agent',
          content: friendlyError,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        console.error('[AppShell] Generate API error:', data?.error);
      }
    } catch (err: any) {
      console.error('[handleGenerate] Error:', err);
      const friendlyError = humanizeUpstreamError(err?.message || 'Media generation failed.');
      const errorMsg: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        sender: 'agent',
        content: friendlyError,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsGenerating(false);
      setGenerationStage(null);
      setServerStageDescription(undefined);
      setServerProgress(undefined);
      setServerModel(undefined);
      setServerExpectedSla(undefined);
    }
  };

  const handleApprovePreflight = async (applyRecalledMemories = false) => {
    const pending = pendingPreflight;
    if (!pending) return;
    setPendingPreflight(null);
    await handleGenerate(
      pending.promptText,
      pending.versionNumber,
      pending.feedbackContext,
      pending.overrideProjectIndex,
      pending.overrideProjectTitle,
      pending.imageUrl,
      pending.chatHistory,
      { bypassPreflight: true, approvedDirectorBrief: pending.directorBrief, applyRecalledMemories }
    );
  };

  const handleCancelPreflight = () => {
    if (!pendingPreflight) return;
    const cancelMsg: ChatMessage = {
      id: `msg-preflight-cancel-${Date.now()}`,
      sender: 'agent',
      content: 'Paused before rendering. Adjust the prompt and send it again when the plan looks right.',
      timestamp: new Date().toISOString(),
    };
    const targetIndex = pendingPreflight.overrideProjectIndex !== undefined
      ? pendingPreflight.overrideProjectIndex
      : currentProjectIndex;
    setPendingPreflight(null);
    setMessages((prev) => [...prev, cancelMsg]);
    setProjects((prev) => {
      const updated = [...prev];
      if (updated[targetIndex]) {
        const proj = { ...updated[targetIndex] };
        proj.messages = [...(proj.messages || []), cancelMsg];
        updated[targetIndex] = proj;
        persistProjectToDb(proj);
      }
      return updated;
    });
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
      // A standing preference as the very first message is still a memory, not
      // a brief - auto-save it and stop instead of burning a render on it.
      if (
        !/\b(create|generate|make a|produce|render|film|animate|video about|scene with|new video|show me|story about)\b/i.test(text.trim().toLowerCase()) &&
        /\b(i like|i love|i prefer|i always|i never|from now on|going forward|remember (that|this)|please remember|save (that|this|it|as)|my standard|by default|in all (my |future )|for (all |future ))/i.test(text)
      ) {
        const saved = await rememberNow(text, newProj);
        const note: ChatMessage = {
          id: `msg-mem-${Date.now()}`,
          sender: 'agent',
          content:
            saved.length > 0
              ? `Remembered: "${saved.join(', ')}" - applies to future renders. Undo anytime in the Memory tab. No video rendered.`
              : `I hear you, but I couldn't distill that into a lasting rule. Tell me a video idea whenever you're ready. No video rendered.`,
          timestamp: new Date().toISOString(),
        };
        setProjects((prev) => {
          const updated = [...prev];
          if (updated[0]) {
            const proj = { ...updated[0] };
            proj.messages = [...(proj.messages || []), note];
            updated[0] = proj;
            persistProjectToDb(proj);
          }
          return updated;
        });
        setMessages((prev) => [...prev, note]);
        return;
      }
      await handleGenerate(text, 1, undefined, 0, newProj.title, imageUrl, [{ role: 'user', content: text }]);
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

    // Extract recent chat history so the LLM remembers previous turns and never neglects the prompt
    const chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = (currentProj.messages || [])
      .slice(-12)
      .map((m) => ({
        role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
        content: m.content,
      }));
    chatHistory.push({ role: 'user', content: text });

    // Delegate ALL intent routing (inquiry, chat, generate, revision) to the server Groq classifier.
    // Never pre-screen with client-side regex here.

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
      await handleGenerate(text, 1, undefined, targetIndex, currentProj.title, imageUrl, chatHistory);
      return;
    }

    // Otherwise, project already has versions.
    // Determine if this is a minor revision tweak on the active version or a brand new prompt
    const nextVersionNumber = currentProj.versions.length + 1;
    const cleanLower = text.trim().toLowerCase();
    const hasCreationIntent = /\b(create|generate|make a|produce|render|film|animate|video about|scene with|new video|show me|story about)\b/i.test(cleanLower);
    const isCorrectionOrRevision =
      !hasCreationIntent &&
      (/^(make it|can you make it|change (the|it)|adjust|tweak|tune|speed up|slow down|slower|faster|darker|lighter|more (vibrant|energetic|cinematic)|less|remove (the|subtitles|captions)|add (subtitles|captions))\b/i.test(cleanLower) ||
       /^(but|wait|i said|i asked for|you forgot|why did|how come|no,|actually|instead|make sure|where are the|the lyrics)\b/i.test(cleanLower) ||
       (/\b(?:60\s*s|30\s*s|minute|lyrics?|full|complete)\b/i.test(cleanLower) && cleanLower.length < 90));

    if (isCorrectionOrRevision) {
      proposeMemoriesFromFeedback(text, currentProj);
      const activeBrief = currentProj.versions[currentProj.currentVersionIndex]?.brief || currentProj.initialPrompt || text;
      await handleGenerate(
        activeBrief,
        nextVersionNumber,
        text,
        targetIndex,
        currentProj.title,
        imageUrl,
        chatHistory
      );
    } else if (
      !hasCreationIntent &&
      /\b(i like|i love|i prefer|i always|i never|from now on|going forward|remember (that|this)|please remember|save (that|this|it|as)|my standard|by default|in all (my |future )|for (all |future ))/i.test(text)
    ) {
      // Standing taste statement, not a render request: auto-save it as memory
      // (explicit preferences are self-confirming) and stop here. Never spend
      // a GPU render on a preference sentence.
      const saved = await rememberNow(text, currentProj);
      const note: ChatMessage = {
        id: `msg-mem-${Date.now()}`,
        sender: 'agent',
        content:
          saved.length > 0
            ? `Remembered: "${saved.join(', ')}" - applies to future renders. Undo anytime in the Memory tab. No video rendered.`
            : `I hear you, but I couldn't distill that into a lasting rule${email ? '' : ' (sign in so I can persist it)'}. Phrase it as one (e.g. "always fade the music out over 2s") or tell me to apply it to this video and I'll re-render. No video rendered.`,
        timestamp: new Date().toISOString(),
      };
      setProjects((prev) => {
        const updated = [...prev];
        if (updated[targetIndex]) {
          const proj = { ...updated[targetIndex] };
          proj.messages = [...(proj.messages || []), note];
          updated[targetIndex] = proj;
          persistProjectToDb(proj);
        }
        return updated;
      });
      setMessages((prev) => [...prev, note]);
      return;
    } else {
      // Fresh creative prompt: always use the user's new prompt text
      await handleGenerate(
        text,
        nextVersionNumber,
        undefined,
        targetIndex,
        currentProj.title,
        imageUrl,
        chatHistory
      );
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

        const prefSummary = pendingPreferences.map((p) => p.preference).join(', ');
        const memSavedMsg: ChatMessage = {
          id: `msg-saved-${Date.now()}`,
          sender: 'agent',
          content: `✨ Remembered: "${prefSummary}".`,
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
      console.error('Failed to save memory:', e);
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
      content: `Started "${projectTitle}". What kind of video would you like to create?`,
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

  // Start New Chat session (creates a separate chat thread in history)
  const handleNewChat = () => {
    const chatNumber = projects.length + 1;
    const sessionTitle = `Chat ${chatNumber}`;
    const newChatMsg: ChatMessage = {
      id: `msg-newchat-${Date.now()}`,
      sender: 'agent',
      content: `Started a new chat session. What would you like to create?`,
      timestamp: new Date().toISOString(),
    };
    const newProj: CreativeProject = {
      id: `proj-${Date.now()}`,
      title: sessionTitle,
      initialPrompt: '',
      createdAt: new Date().toISOString(),
      currentVersionIndex: 0,
      versions: [],
      messages: [newChatMsg],
    };

    const newIndex = projects.length;
    setProjects((prev) => [...prev, newProj]);
    setCurrentProjectIndex(newIndex);
    setMessages([newChatMsg]);
    setPendingPreferences([]);
    persistProjectToDb(newProj);

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
  };

  // Delete a specific generated version from a project / gallery
  const handleDeleteVersion = (projectId: string, versionIndex: number) => {
    setProjects((prev) => {
      const updated = prev.map((p) => {
        if (p.id === projectId) {
          const targetVer = (p.versions || [])[versionIndex];
          const deletedVNum = targetVer?.versionNumber;
          const newVersions = (p.versions || []).filter((_, idx) => idx !== versionIndex);
          const newIdx = Math.max(0, Math.min(p.currentVersionIndex, newVersions.length - 1));
          const newMessages = deletedVNum !== undefined
            ? (p.messages || []).filter((m) => m.versionNumber !== deletedVNum)
            : (p.messages || []);
          const updatedProj: CreativeProject = {
            ...p,
            versions: newVersions,
            currentVersionIndex: newIdx,
            messages: newMessages,
          };
          persistProjectToDb(updatedProj);
          if (p.id === activeProject?.id) {
            setMessages(newMessages);
          }
          return updatedProj;
        }
        return p;
      });
      return updated;
    });
  };

  // Delete an individual chat message
  const handleDeleteMessage = (messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    setProjects((prev) => {
      const updated = [...prev];
      if (updated[currentProjectIndex]) {
        const proj = { ...updated[currentProjectIndex] };
        proj.messages = (proj.messages || []).filter((m) => m.id !== messageId);
        updated[currentProjectIndex] = proj;
        persistProjectToDb(proj);
      }
      return updated;
    });
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
    if (remaining[nextIdx]) {
      setMessages(
        remaining[nextIdx].messages && remaining[nextIdx].messages.length > 0
          ? remaining[nextIdx].messages
          : [
              {
                id: `msg-sel-${Date.now()}`,
                sender: 'agent',
                content: `Loaded "${remaining[nextIdx].title}". Ready for your creative instructions.`,
                timestamp: new Date().toISOString(),
              },
            ]
      );
    } else {
      setMessages([]);
    }
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

  // Forget memory (optimistic: card vanishes instantly, restored on failure)
  const handleForgetMemory = async (id: string) => {
    setActiveMemories((prev) => prev.filter((m) => m.id !== id));
    try {
      const res = await fetch('/api/memwal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'forget',
          id,
          email: email || undefined,
          userId: email || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        // Durable delete failed (e.g. Walrus relayer throttled) - re-sync so
        // the item restores instead of fake-deleting then reappearing later.
        console.error('Failed to forget memory:', data?.error || res.status);
        if (email) await fetchMemories(email);
        return;
      }
    } catch (e) {
      console.error('Failed to forget memory:', e);
      if (email) await fetchMemories(email);
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
          onRefreshProjects={(preferredId?: string) => {
            if (email) loadProjects(email, preferredId || activeProject?.id);
          }}
          isGenerating={isGenerating}
          generationStage={generationStage}
          generationElapsedSeconds={generationElapsedSeconds}
          serverProgress={serverProgress}
          serverStageDescription={serverStageDescription}
          serverModel={serverModel}
          serverExpectedSla={serverExpectedSla}
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
          pendingPreflight={pendingPreflight?.plan || null}
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
          onConfirmPreflight={handleApprovePreflight}
          onCancelPreflight={handleCancelPreflight}
          isSavingMemory={isSavingMemory}
          onNewProject={(title, prompt) => handleCreateNewProject(title, prompt)}
          onNewChat={handleNewChat}
          onDeleteMessage={handleDeleteMessage}
          onRenameProject={handleRenameProject}
          onDeleteProject={handleDeleteProject}
          onResetProject={handleResetProject}
          onDeleteVersion={handleDeleteVersion}
          activeMemories={activeMemories}
          isLoadingMemories={isLoadingMemories}
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
          document.getElementById('product')?.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* 3. Nue Motion Showcase: the product first */}
      <NueMotionShowcase
        onOpenWorkspace={() => router.push('/motion')}
      />

      {/* 4. How learning works (compact band + CTA) */}
      <DifferentiatorSection onOpenWorkspace={() => router.push('/motion')} />

      {/* 5. Landing Footer */}
      <LandingFooter
        onOpenWorkspace={() => router.push('/motion')}
        onOpenDocs={() => {
          document.getElementById('product')?.scrollIntoView({ behavior: 'smooth' });
        }}
      />
    </div>
  );
}
