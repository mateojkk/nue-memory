/**
 * Durable pending-render descriptors (Supabase).
 *
 * The in-memory job registry dies with the serverless instance and
 * localStorage dies with the browser. This table is what lets a render
 * started on your phone finish into your gallery when you open your laptop
 * hours later: the descriptor carries everything GET needs to poll Livepeer
 * to completion and build the full media version.
 *
 * All helpers are best-effort: if Supabase is down (or the table was never
 * migrated), they warn and resolve empty so generation never blocks on
 * bookkeeping.
 */
import { supabase } from '@/lib/supabase/client';

export interface PendingRenderRow {
  jobId: string;
  userId: string;
  projectId?: string;
  projectTitle?: string;
  versionNumber: number;
  livepeerJobId?: string;
  scene2JobId?: string;
  audioJobId?: string;
  model?: string;
  singleTakeDuration?: number;
  directorBrief?: any;
  syntheticPreferences?: any[];
  createdAt?: string;
}

const TABLE = 'pending_renders';
const ROW_TTL_MS = 48 * 60 * 60 * 1000;

function isMissingTable(err: any): boolean {
  const msg = String(err?.message || err?.code || err);
  return /42P01|does not exist|relation .* does not exist/i.test(msg);
}

export async function savePendingRender(row: PendingRenderRow): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase.from(TABLE).upsert(
      {
        job_id: row.jobId,
        user_id: row.userId,
        project_id: row.projectId || null,
        project_title: row.projectTitle || null,
        version_number: row.versionNumber || 1,
        livepeer_job_id: row.livepeerJobId || null,
        scene2_job_id: row.scene2JobId || null,
        audio_job_id: row.audioJobId || null,
        model: row.model || null,
        single_take_duration: row.singleTakeDuration || null,
        director_brief: row.directorBrief || null,
        synthetic_preferences: row.syntheticPreferences || [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'job_id' }
    );
    if (error && !isMissingTable(error)) {
      console.warn('[pending-renders] Save notice:', error.message);
    }
  } catch (err) {
    console.warn('[pending-renders] Save notice:', err instanceof Error ? err.message : err);
  }
}

export async function deletePendingRender(jobId: string): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase.from(TABLE).delete().eq('job_id', jobId);
    if (error && !isMissingTable(error)) {
      console.warn('[pending-renders] Delete notice:', error.message);
    }
  } catch (err) {
    console.warn('[pending-renders] Delete notice:', err instanceof Error ? err.message : err);
  }
}

function toRow(r: any): PendingRenderRow {
  return {
    jobId: r.job_id,
    userId: r.user_id,
    projectId: r.project_id || undefined,
    projectTitle: r.project_title || undefined,
    versionNumber: Number(r.version_number) || 1,
    livepeerJobId: r.livepeer_job_id || undefined,
    scene2JobId: r.scene2_job_id || undefined,
    audioJobId: r.audio_job_id || undefined,
    model: r.model || undefined,
    singleTakeDuration: r.single_take_duration ? Number(r.single_take_duration) : undefined,
    directorBrief: r.director_brief || undefined,
    syntheticPreferences: Array.isArray(r.synthetic_preferences) ? r.synthetic_preferences : [],
    createdAt: r.created_at || new Date().toISOString(),
  };
}

export async function getPendingRender(jobId: string): Promise<PendingRenderRow | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from(TABLE).select('*').eq('job_id', jobId).maybeSingle();
    if (error || !data) return null;
    if (Date.now() - new Date(data.created_at).getTime() > ROW_TTL_MS) {
      await deletePendingRender(jobId);
      return null;
    }
    return toRow(data);
  } catch {
    return null;
  }
}

export async function listPendingRenders(userId: string): Promise<PendingRenderRow[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
    if (error || !data) return [];
    const cutoff = Date.now() - ROW_TTL_MS;
    const fresh = data.filter((r: any) => Date.now() - new Date(r.created_at).getTime() <= cutoff);
    // Best-effort stale cleanup without awaiting.
    for (const r of data) {
      if (Date.now() - new Date(r.created_at).getTime() > cutoff) {
        void deletePendingRender(r.job_id);
      }
    }
    return fresh.map(toRow);
  } catch {
    return [];
  }
}
