import { MediaVersion } from '@/lib/types';

export type JobStatus =
  | 'queued'
  | 'directing'
  | 'rendering'
  | 'assembling'
  | 'completed'
  | 'failed';

export interface GenerationJobResult {
  mediaVersion: MediaVersion | null;
  directorMessage?: string;
  enrichedPrompt?: string;
  appliedMemories?: any[];
  summaryTokens?: string[];
  retrievalCount?: number;
}

export interface GenerationJob {
  id: string;
  userId: string;
  projectTitle: string;
  versionNumber: number;
  status: JobStatus;
  progress: number; // 0 to 100
  stageDescription: string;
  createdAt: string;
  updatedAt: string;
  result?: GenerationJobResult;
  error?: string;
  livepeerJobId?: string;
  audioJobId?: string;
  audioUrl?: string;
  directorBrief?: any;
  syntheticPreferences?: any[];
  modelToUse?: string;
  expectedSla?: string;
  /** Set once a mid-render scanner false-flag already triggered a re-roll. */
  paraphraseRetried?: boolean;
  /** Standing rules auto-learned from revision feedback (Mem0-style). */
  learnedMemories?: any[];
  /** Determinism seed for this take; reused by revisions for continuity. */
  seed?: number;
  /** Livepeer-reported estimate at dispatch (USD). Used for the 402 gate. */
  estimatedCostUsd?: number;
  /** Amount held at dispatch; released on failure/expiry, settled at completion. */
  heldCostUsd?: number;
  /** Soundtrack estimate at dispatch (USD), itemized next to the video charge. */
  audioEstimatedCostUsd?: number;
  /** True when rendering on the caller's own Livepeer key ($0 on our ledger). */
  useOwnKey?: boolean;
  /** Final billed amount; set once, when the take completes. */
  billedCostUsd?: number;
  singleTakeDuration?: number;
  effectiveDuration?: number;
  isMultiScene?: boolean;
  scene1JobId?: string;
  scene2JobId?: string;
  scene1Url?: string;
  scene2Url?: string;
  scene1Prompt?: string;
  scene2Prompt?: string;
  scenes?: any[];
  characterAnchorUrl?: string;
}

// Global in-memory job map preserved across module re-evaluations and HMR in this process
const globalForJobs = globalThis as unknown as {
  nueJobRegistry?: Map<string, GenerationJob>;
};

const jobRegistry = globalForJobs.nueJobRegistry ?? new Map<string, GenerationJob>();
if (!globalForJobs.nueJobRegistry) {
  globalForJobs.nueJobRegistry = jobRegistry;
}

// Clean up jobs older than 1 hour periodically
const JOB_TTL_MS = 60 * 60 * 1000;

function cleanupOldJobs() {
  const now = Date.now();
  for (const [id, job] of jobRegistry.entries()) {
    if (now - new Date(job.createdAt).getTime() > JOB_TTL_MS) {
      jobRegistry.delete(id);
    }
  }
}

export function createJob(params: {
  id: string;
  userId: string;
  projectTitle: string;
  versionNumber: number;
}): GenerationJob {
  cleanupOldJobs();

  const now = new Date().toISOString();
  const job: GenerationJob = {
    id: params.id,
    userId: params.userId,
    projectTitle: params.projectTitle,
    versionNumber: params.versionNumber,
    status: 'queued',
    progress: 5,
    stageDescription: 'Initializing video generation job...',
    createdAt: now,
    updatedAt: now,
  };

  jobRegistry.set(params.id, job);
  return job;
}

export function getJob(jobId: string): GenerationJob | undefined {
  return jobRegistry.get(jobId);
}

export function setJob(job: GenerationJob): GenerationJob {
  jobRegistry.set(job.id, job);
  return job;
}

export function updateJob(
  jobId: string,
  updates: Partial<Omit<GenerationJob, 'id' | 'createdAt'>>
): GenerationJob | undefined {
  const job = jobRegistry.get(jobId);
  if (!job) return undefined;

  const updated: GenerationJob = {
    ...job,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  jobRegistry.set(jobId, updated);
  return updated;
}
