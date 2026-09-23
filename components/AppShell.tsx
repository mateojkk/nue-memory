'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

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
    /** Server-split dispatch inputs: approved re-POST renders from these. */
    brief?: string;
    feedback?: string;
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
  const pathname = usePathname();
  const currentView = view;
  const { ready, authenticated, email, refreshCredits } = useAuth();

  // Returning creators skip the pitch: root (/) forwards authenticated
  // studio veterans straight to /motion. /landing never forwards, so the
  // logo and shared links always have a stable home.
  useEffect(() => {
    if (pathname !== '/' || !ready || !authenticated) return;
    try {
      if (window.localStorage.getItem('nue_seen_studio') === '1') {
        router.push('/motion');
      }
    } catch {
      // Restricted storage: stay on the landing.
    }
  }, [pathname, ready, authenticated, router]);

  // Mark studio veterans (dashboard reached while signed in).
  useEffect(() => {
    if (currentView === 'dashboard' && authenticated && email) {
      try {
        window.localStorage.setItem('nue_seen_studio', '1');
      } catch {
        // Restricted storage: landing stays the entry point.
      }
    }
  }, [currentView, authenticated, email]);

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

  // Union-merge incoming memories into state by id (then category:text).
  // A blind overwrite would drop just-saved rules whenever the vector index
  // lags behind the write (Mem0 has the same async-indexing class: confirmed
  // stored does not mean immediately recallable).
  const mergeMemoriesIntoState = (
    prev: MotionPreference[],
    incoming: MotionPreference[]
  ): MotionPreference[] => {
    const seenIds = new Set(prev.map((p) => p.id).filter(Boolean));
    const keys = new Set(prev.map((p) => `${p.category}:${p.preference}`.toLowerCase()));
    const next = [...prev];
    for (const mem of incoming) {
      const key = `${mem.category}:${mem.preference}`.toLowerCase();
      if ((mem.id && seenIds.has(mem.id)) || keys.has(key)) continue;
      if (mem.id) seenIds.add(mem.id);
      keys.add(key);
      next.push(mem);
    }
    return next;
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

  // Resume renders abandoned by navigation or refresh. Livepeer kept working;
  // reattach polling so finished takes land instead of vanishing. Merges the
  // same-browser localStorage list with the durable Supabase list so renders
  // survive hours away and device switches.
  const resumedRef = useRef(false);
  useEffect(() => {
    if (resumedRef.current || !email || projects.length === 0) return;
    resumedRef.current = true;
    (async () => {
      const local = readPersistedJobs();
      let remote: PersistedJob[] = [];
      try {
        const res = await fetch(`/api/pending-renders?email=${encodeURIComponent(email)}`);
        const data = await res.json().catch(() => null);
        if (res.ok && data?.success && Array.isArray(data.pending)) {
          remote = data.pending.map((p: any) => ({
            jobId: String(p.jobId),
            livepeerJobId: p.livepeerJobId || undefined,
            scene2JobId: p.scene2JobId || undefined,
            audioJobId: p.audioJobId || undefined,
            targetIndex: -1,
            projectId: p.projectId || undefined,
            projectTitle: p.projectTitle || undefined,
            versionNumber: Number(p.versionNumber) || 1,
            startedAt: p.startedAt || new Date().toISOString(),
          }));
        }
      } catch {
        // Server list unavailable: local entries still resume.
      }
      const seen = new Set<string>();
      const pending = [...local, ...remote].filter((j) => {
        if (!j.jobId || seen.has(j.jobId)) return false;
        seen.add(j.jobId);
        return true;
      });
      if (pending.length === 0) return;
      for (const pj of pending) {
        const byId = pj.projectId ? projects.findIndex((p) => p.id === pj.projectId) : -1;
        const targetIndex =
          byId >= 0 ? byId : pj.targetIndex >= 0 && pj.targetIndex < projects.length ? pj.targetIndex : -1;
        // Already landed (e.g. finished in another tab): drop silently.
        if (targetIndex < 0 || projects[targetIndex].versions.length >= pj.versionNumber) {
          clearPersistedJob(pj.jobId);
          continue;
        }
        setGenerationStage('cooking');
        setServerStageDescription('Reattached to your running render…');
        try {
          const completedResult = await pollGenerationJob(pj);
          applyCompletedMedia({ success: true, ...completedResult }, targetIndex, true);
        } catch (e) {
          console.warn('[resume] Reattached render did not complete:', e instanceof Error ? e.message : e);
        } finally {
          clearPersistedJob(pj.jobId);
        }
      }
      setGenerationStage(null);
      setServerStageDescription(undefined);
      setServerProgress(undefined);
      setServerModel(undefined);
      setServerExpectedSla(undefined);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, projects.length]);

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

  // Persisted in-flight renders. Livepeer keeps rendering after we navigate
  // away or refresh - without this the finished take has nowhere to land.
  interface PersistedJob {
    jobId: string;
    livepeerJobId?: string;
    scene2JobId?: string;
    audioJobId?: string;
    targetIndex: number;
    projectId?: string;
    projectTitle?: string;
    versionNumber: number;
    promptText?: string;
    startedAt: string;
  }

  const PERSISTED_JOBS_KEY = 'nue_active_jobs';
  const PERSISTED_JOB_TTL_MS = 30 * 60 * 1000;

  const readPersistedJobs = (): PersistedJob[] => {
    try {
      const raw = window.localStorage.getItem(PERSISTED_JOBS_KEY);
      if (!raw) return [];
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) return [];
      const now = Date.now();
      return list.filter(
        (j) => j && typeof j.jobId === 'string' && now - new Date(j.startedAt).getTime() < PERSISTED_JOB_TTL_MS
      );
    } catch {
      return [];
    }
  };

  const persistActiveJob = (job: PersistedJob) => {
    try {
      const rest = readPersistedJobs().filter((j) => j.jobId !== job.jobId);
      window.localStorage.setItem(PERSISTED_JOBS_KEY, JSON.stringify([...rest, job].slice(-5)));
    } catch {
      // Storage unavailable: resume simply won't happen.
    }
  };

  const clearPersistedJob = (jobId: string) => {
    try {
      window.localStorage.setItem(
        PERSISTED_JOBS_KEY,
        JSON.stringify(readPersistedJobs().filter((j) => j.jobId !== jobId))
      );
    } catch {
      // Ignore storage errors.
    }
  };

  // Shared poll loop: follows one GPU job to completion. Used live by
  // handleGenerate and on return by the resume effect. Throws on failure or
  // after the 15-minute window so callers handle both identically.
  const pollGenerationJob = async (keys: {
    jobId: string;
    livepeerJobId?: string;
    scene2JobId?: string;
    audioJobId?: string;
  }): Promise<any> => {
    const pollIntervalMs = 3000;
    const maxPollAttempts = 300; // 300 * 3s = 900s (15 min window for Seedance takes)
    for (let attempt = 0; attempt < maxPollAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      try {
        const pollUrl =
          `/api/generate?jobId=${encodeURIComponent(keys.jobId)}` +
          (keys.livepeerJobId ? `&livepeerJobId=${encodeURIComponent(keys.livepeerJobId)}` : '') +
          (keys.scene2JobId ? `&scene2JobId=${encodeURIComponent(keys.scene2JobId)}` : '') +
          (keys.audioJobId ? `&audioJobId=${encodeURIComponent(keys.audioJobId)}` : '');

        const pollRes = await fetch(pollUrl);
        if (pollRes.ok) {
          const pollData = await pollRes.json();
          if (pollData.success && pollData.job) {
            const job = pollData.job;
            if (job.status === 'completed') {
              return job.result;
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
    throw new Error('Video generation took longer than expected due to remote GPU queue congestion. Please check your gallery in a moment.');
  };

  // Applies one finished take to a project: version, agent message, credit
  // refresh, persistence. Shared by live renders and resumed ones so a render
  // you walked away from lands exactly where a watched one would.
  const applyCompletedMedia = (data: any, targetIndex: number, resumed = false) => {
    const newVersion: MediaVersion = data.mediaVersion;

    // Billing is server-authoritative now: the take was already charged at
    // its reported Livepeer cost on completion. Just refresh the display.
    refreshCredits?.();

    // Re-sync durable memories only. Render traces are shown on the video card but are not memory.
    if (email) {
      fetchMemories(email);
    }

    // Revision background learning: merge rules the server auto-saved while
    // rendering (union - the vector index may lag the confirmed write).
    const learned = Array.isArray(data.learnedMemories) ? data.learnedMemories : [];
    if (learned.length > 0) {
      setActiveMemories((prev) => mergeMemoriesIntoState(prev, learned));
    }

    const audioNotice = newVersion.audioStyle?.audioUrl
      ? `\n\n🎵 Soundtrack: ${newVersion.audioStyle.style}.`
      : '';

    let agentContent = data.directorMessage || `Here's Version ${newVersion.versionNumber}!`;
    if (resumed) {
      agentContent = `Welcome back - your render finished while you were away. ${agentContent}`;
    }
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
  };

  // Grabs the last frame of the current take as a JPEG data URL so revisions
  // continue from v1's pixels (seedance-25-i2v) instead of re-rolling blind.
  // Returns null on anything (CORS taint, no video, seek failure) - the caller
  // then falls back to the text-only revision path. No render depends on this.
  const captureActiveFrame = async (): Promise<string | null> => {
    try {
      const video = document.querySelector('video[data-nue-capture="active"]') as HTMLVideoElement | null;
      if (!video || !video.src) return null;
      const originalTime = video.currentTime;
      const dur = Number.isFinite(video.duration) ? video.duration : 0;
      if (dur > 0.3) {
        await new Promise<void>((resolve) => {
          const timer = window.setTimeout(() => resolve(), 1500);
          const onSeeked = () => {
            window.clearTimeout(timer);
            resolve();
          };
          video.addEventListener('seeked', onSeeked, { once: true });
          try {
            video.currentTime = Math.max(0, dur - 0.15);
          } catch {
            resolve();
          }
        });
      }
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) return null;
      const scale = Math.min(1, 1280 / w);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      try {
        if (Number.isFinite(originalTime)) video.currentTime = originalTime;
      } catch {
        // Restore playback position best-effort only.
      }
      const url = canvas.toDataURL('image/jpeg', 0.82);
      // Livepeer inlines base64 source frames up to ~3MB - stay well under.
      if (url.length > 3.5 * 1024 * 1024) return null;
      return url;
    } catch {
      return null;
    }
  };

  const handleGenerate = async (
    promptText: string,
    versionNumber = 1,
    feedbackContext?: string,
    overrideProjectIndex?: number,
    overrideProjectTitle?: string,
    imageUrl?: string,
    chatHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: { bypassPreflight?: boolean; approvedDirectorBrief?: any; applyRecalledMemories?: boolean; seed?: number }
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
          projectId: projects[targetIndex]?.id || activeProject?.id || undefined,
          feedbackContext,
          chatHistory,
          email: email || undefined,
          userId: email || undefined,
          imageUrl: imageUrl || undefined,
          preflightOnly: !options?.bypassPreflight,
          approvedDirectorBrief: options?.approvedDirectorBrief,
          applyRecalledMemories: Boolean(options?.applyRecalledMemories),
          seed: options?.seed,
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
          // Server-split feedback wins: the classifier decided what is brief
          // vs revision. Falls back to the client-passed context if absent.
          feedbackContext: data.plan.feedback ?? feedbackContext,
          overrideProjectIndex,
          overrideProjectTitle,
          imageUrl,
          chatHistory,
          directorBrief: data.directorBrief,
          plan: data.plan,
        });
        return;
      }
      // Asynchronous Job Polling Architecture (shared helper also used on resume)
      else if (data.success && data.jobId) {
        const jobId = data.jobId;
        const livepeerJobId = data.livepeerJobId;
        const scene2JobId = data.scene2JobId;
        const audioJobId = data.audioJobId;

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

        // Persist so a refresh or tab switch resumes instead of abandoning.
        persistActiveJob({
          jobId,
          livepeerJobId,
          scene2JobId,
          audioJobId,
          targetIndex,
          projectId: activeProject?.id,
          projectTitle: targetTitle,
          versionNumber,
          promptText,
          startedAt: new Date().toISOString(),
        });

        let completedResult: any = null;
        try {
          completedResult = await pollGenerationJob({ jobId, livepeerJobId, scene2JobId, audioJobId });
        } finally {
          clearPersistedJob(jobId);
        }

        data = { success: true, ...completedResult };
      }

      if (data.success && data.mediaVersion) {
        applyCompletedMedia(data, targetIndex);
      } else if (data.success && data.directorMessage) {
        // Conversational agent reply (greeting, clarification, memory saved)
        // without GPU render.
        const agentMsg: ChatMessage = {
          id: `msg-${Date.now()}`,
          sender: 'agent',
          content:
            data.directorMessage +
            (data.savedMemory && typeof data.savedMemory.preference === 'string'
              ? `\n\nRemembered: "${data.savedMemory.preference}" - applies to future renders. Undo anytime in the Memory tab.`
              : data.saveError
              ? `\n\nCouldn't store the rule just now - memory storage is busy. Say "remember that" again in a bit.`
              : ''),
          timestamp: new Date().toISOString(),
        };

        // Server auto-save: merge the stored rule straight into state (plus
        // the legacy Remember-card path when the server only proposes).
        const sm = data.savedMemory;
        if (sm && typeof sm.preference === 'string' && sm.preference.trim().length > 0) {
          const stored = {
            type: 'media_preference' as const,
            category: typeof sm.category === 'string' && sm.category ? sm.category : 'visual_style',
            preference: sm.preference.trim(),
            strength: 'high' as const,
            scope: 'media' as const,
            source: 'user_feedback' as const,
            projectId: activeProject?.id,
            projectTitle: activeProject?.title,
            userId: email || undefined,
            id: typeof sm.id === 'string' ? sm.id : `mem-${Date.now()}`,
            createdAt: typeof sm.createdAt === 'string' ? sm.createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: true as const,
          };
          setActiveMemories((prev) => mergeMemoriesIntoState(prev, [stored]));
        }

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
    // Carry the active take's seed through approval so the approved render
    // still revises rather than re-rolling when feedback is present.
    const approveIdx = pending.overrideProjectIndex !== undefined ? pending.overrideProjectIndex : currentProjectIndex;
    const approveProj = projects[approveIdx];
    const approveSeed = pending.feedbackContext
      ? approveProj?.versions[approveProj.currentVersionIndex]?.seed
      : undefined;
    await handleGenerate(
      pending.promptText,
      pending.versionNumber,
      pending.feedbackContext,
      pending.overrideProjectIndex,
      pending.overrideProjectTitle,
      pending.imageUrl,
      pending.chatHistory,
      { bypassPreflight: true, approvedDirectorBrief: pending.directorBrief, applyRecalledMemories, seed: pending.imageUrl ? undefined : approveSeed }
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
      // Single path: the server classifier decides (brief, memory, chat).
      // Memory intent auto-saves with no render; anything else preflights.
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

    // Delegate ALL intent routing (inquiry, chat, generate, revision, memory)
    // to the server Groq classifier. Never pre-screen with client-side regex
    // here. Safe while cooking too: nothing auto-dispatches (renders start
    // only from explicit preflight approval), and billing holds bound cost.

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

    // Single send path: the server classifier owns ALL intent routing (fresh
    // brief, revision, memory, chat). The client only supplies raw materials:
    // text, history, the active take's seed, and its last frame. The server
    // uses seed and frame exclusively on revision intent, so fresh briefs can
    // never inherit old pixels or rolls.
    const nextVersionNumber = currentProj.versions.length + 1;
    const chainedFrame = imageUrl
      ? null
      : currentProj.versions.length > 0
        ? await captureActiveFrame()
        : null;
    const activeSeed = currentProj.versions[currentProj.currentVersionIndex]?.seed;
    await handleGenerate(
      text,
      nextVersionNumber,
      undefined,
      targetIndex,
      currentProj.title,
      chainedFrame || imageUrl,
      chatHistory,
      {
        ...(typeof activeSeed === 'number' ? { seed: activeSeed } : {}),
        ...(chainedFrame ? { chainedFrame: true } : {}),
      }
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
        const confirmed: MotionPreference[] = (data.storedPreferences || pendingPreferences).map((p: any) => ({
          ...p,
          isActive: true,
        }));
        const getUrl = email ? `/api/memwal?email=${encodeURIComponent(email)}` : '/api/memwal';
        const getRes = await fetch(getUrl);
        const getData = await getRes.json();
        if (getData.success && getData.preferences) {
          // Union, never overwrite: confirmed writes may not be recallable
          // yet while the vector index catches up.
          setActiveMemories((prev) => mergeMemoriesIntoState(prev, curateMemories(getData.preferences)));
        }
        setActiveMemories((prev) => mergeMemoriesIntoState(prev, confirmed));

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

      {/* 2. Hero Section (Nue Memory, creator language) */}
      <HeroSection
        onGetStarted={() => router.push('/motion')}
        onViewDocs={() => {
          document.getElementById('product')?.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* 3. Nue Motion Showcase: first app built on Nue Memory */}
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
