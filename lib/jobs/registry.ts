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
  singleTakeDuration?: number;
  effectiveDuration?: number;
}

// Global in-memory job map across requests within this server instance
const jobRegistry = new Map<string, GenerationJob>();

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
