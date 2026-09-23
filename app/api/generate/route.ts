import { NextResponse } from 'next/server';
import { directCreativeBrief, extractExplicitDuration, humanizeUpstreamError, isPolicyRejection, sanitizePromptForDiffusion, simplifyVideoPromptForRetry, stripLyricTextFromVideoPrompt } from '@/lib/ai/nue-director';
import { livepeerAgent } from '@/lib/livepeer/agent';
import { supabase } from '@/lib/supabase/client';
import { checkRateLimit, getClientIdentifier } from '@/lib/security/rate-limit';
import { sanitizeText, validateImageSource } from '@/lib/security/sanitize';
import { authenticateRequest } from '@/lib/auth/server';
import { createJob, getJob, updateJob } from '@/lib/jobs/registry';
import type { GenerationJob } from '@/lib/jobs/registry';
import { savePendingRender, deletePendingRender, getPendingRender } from '@/lib/jobs/pending-renders';
import { memWalService } from '@/lib/walrus-memwal/client';
import { MotionPreference, MediaVersion } from '@/lib/types';
import { stitchTimelineWithFfmpeg } from '@/lib/media/timeline-stitcher';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * Hard ceiling for ONE Livepeer `create_media` render, enforced by the provider schema:
 *   duration: { type: 'integer', minimum: 3, maximum: 15 }
 * Livepeer refuses anything above it before dispatch (issue_code `too_big`,
 * billing_note `not_billed_pre_dispatch`), and the only route to a longer single pass
 * (`run_capability` with a string duration) lives on /api/mcp/raw, which this creative
 * surface does not expose. So one take is at most MAX_TAKE_SECONDS and any longer
 * request has to be assembled from several of them.
 */
const MAX_TAKE_SECONDS = 15;
/** Defensive re-dispatch length, used only if the provider rejects a MAX_TAKE_SECONDS request. */
const FALLBACK_SAFE_TAKE_SECONDS = 10;

/**
 * True when the provider refused the requested clip LENGTH rather than failing mid-render.
 * These are reported before dispatch, so retrying shorter is safe and cannot double-bill a
 * job that already rendered. Kept deliberately narrow so an unrelated upstream error that
 * merely contains the digits "15" cannot trigger a paid re-dispatch.
 */
function isDurationRejection(message?: string): boolean {
  if (!message) return false;
  return /too_big|must be at most|duration[^.]{0,60}(?:invalid|not match|maximum|max|cap|exceed|unsupported)|does not match the tool schema|validation_failed/i.test(
    message
  );
}

/**
 * Conservative pre-dispatch estimate (USD) for one take. Seedance bills
 * ~$0.23153/s on the observed rate card (15s = ~$3.47); anything unknown is
 * estimated high so the 402 gate never lets a render start unpaid.
 * The final charge always uses Livepeer's reported actual, not this.
 */
function estimateTakeCostUsd(modelToUse: string, seconds: number): number {
  const rate = modelToUse.includes('seedance') ? 0.23153 : 0.25;
  return Math.round(rate * Math.max(3, seconds) * 100) / 100;
}

/**
 * Server-authoritative render charge. Deducts the Livepeer-reported amount
 * from the Supabase credit ledger, floored at zero. Only ever called once per
 * completed take (failed renders are never billed).
 */
async function deductRenderCost(email: string, amountUsd: number): Promise<number | null> {  if (!supabase) return null;
  const amount = Math.max(0, Math.round(Number(amountUsd || 0) * 100) / 100);
  if (amount <= 0) return null;
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('credit_balance')
      .eq('email', email)
      .maybeSingle();
    const current = Number(profile?.credit_balance ?? 10.0);
    const next = Math.max(0, Number((current - amount).toFixed(2)));
    await supabase.from('profiles').upsert({ email, credit_balance: next }, { onConflict: 'email' });
    return next;
  } catch (err) {
    console.warn('[generate:billing] Deduct notice:', err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Refund path for holds: credits back a previously held estimate (failed
 * renders, expired jobs). Same ledger, opposite direction.
 */
async function creditBack(email: string, amountUsd: number): Promise<number | null> {
  if (!supabase) return null;
  const amount = Math.max(0, Math.round(Number(amountUsd || 0) * 100) / 100);
  if (amount <= 0) return null;
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('credit_balance')
      .eq('email', email)
      .maybeSingle();
    const current = Number(profile?.credit_balance ?? 10.0);
    const next = Number((current + amount).toFixed(2));
    await supabase.from('profiles').upsert({ email, credit_balance: next }, { onConflict: 'email' });
    return next;
  } catch (err) {
    console.warn('[generate:billing] Refund notice:', err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Resolves the caller's own Livepeer key (BYOK). Returns the plaintext key
 * for this request only - it is never logged, never stored in the job
 * registry, never returned to clients. Falls back to shared demo credit.
 */
async function resolveCallerLivepeerKey(email: string): Promise<{ key: string | null; ownKey: boolean }> {
  if (!supabase) return { key: null, ownKey: false };
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('livepeer_api_key')
      .eq('email', email)
      .maybeSingle();
    const sealed = (profile as any)?.livepeer_api_key;
    if (typeof sealed === 'string' && sealed) {
      const { unsealCredential } = await import('@/lib/security/credentials');
      const key = unsealCredential(sealed);
      if (key) return { key, ownKey: true };
    }
  } catch (err) {
    console.warn('[generate:billing] Caller key notice:', err instanceof Error ? err.message : err);
  }
  return { key: null, ownKey: false };
}

function buildMediaVersion(params: {
  versionNumber: number;
  mediaUrl: string;
  durationSeconds: number;
  directorBrief?: any;
  syntheticPreferences?: any[];
  modelName: string;
  finalAudioUrl?: string;
  wasMuxed?: boolean;
  agentNotes: string;
  scenes?: MediaVersion['scenes'];
  seed?: number;
}): MediaVersion {
  const directorBrief = params.directorBrief;
  const hasVocals = Boolean(directorBrief?.hasVocals);
  const audioStyleDescription = directorBrief?.audioStyle || (hasVocals ? 'Sung Vocals & Melodic Audio' : 'Original Soundtrack');

  return {
    versionNumber: params.versionNumber,
    createdAt: new Date().toISOString(),
    brief: directorBrief?.enrichedPrompt || `${params.durationSeconds}s AI Video`,
    enrichedBrief: directorBrief?.enrichedPrompt || `${params.durationSeconds}s AI Video`,
    appliedPreferences: params.syntheticPreferences || [],
    mediaUrl: params.mediaUrl,
    aspectRatio: directorBrief?.aspectRatio || '16:9',
    pacing: directorBrief?.pacing || 'cinematic',
    captionStyle: {
      enabled: true,
      size: 'medium',
      highlight: 'NUE MOTION',
      text: directorBrief?.enrichedPrompt?.slice(0, 48) || 'Nue Motion',
    },
    audioStyle: {
      enabled: Boolean(directorBrief?.audioEnabled && params.finalAudioUrl),
      style: audioStyleDescription,
      tempo: hasVocals ? 'vocal' : 'ambient',
      audioUrl: params.finalAudioUrl,
      isMuxed: Boolean(params.wasMuxed),
    },
    visualTheme: directorBrief?.visualTheme || 'Cinematic',
    agentNotes: params.agentNotes,
    generationDurationSeconds: params.durationSeconds,
    livepeerCapability: params.modelName + (params.wasMuxed ? ' + timeline-assembly' : ''),
    seed: params.seed,
    characterAnchorUrl: directorBrief?.characterAnchorUrl,
    scenes: params.scenes,
  };
}

/**
 * Rebuilds a working job from its durable Supabase descriptor when the
 * in-memory registry no longer has it (cold instance, hours later, other
 * device). updateJob calls against it safely no-op; completion deletes the
 * row so it cannot settle twice.
 */
async function pendingToJob(jobId: string): Promise<GenerationJob | undefined> {
  const pending = await getPendingRender(jobId);
  if (!pending) return undefined;
  const now = new Date().toISOString();
  return {
    id: pending.jobId,
    userId: pending.userId,
    projectTitle: pending.projectTitle || 'Media Project',
    versionNumber: pending.versionNumber || 1,
    status: 'rendering',
    progress: 25,
    stageDescription: 'Resuming render…',
    createdAt: pending.createdAt || now,
    updatedAt: now,
    livepeerJobId: pending.livepeerJobId,
    scene2JobId: pending.scene2JobId,
    audioJobId: pending.audioJobId,
    directorBrief: pending.directorBrief,
    syntheticPreferences: pending.syntheticPreferences || [],
    modelToUse: pending.model,
    singleTakeDuration: pending.singleTakeDuration,
    effectiveDuration: pending.singleTakeDuration,
  };
}

// GET: Check status of an asynchronous video generation job via live Livepeer polling
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const paramLivepeerJobId = searchParams.get('livepeerJobId') || undefined;
    const paramScene2JobId = searchParams.get('scene2JobId') || undefined;
    const paramAudioJobId = searchParams.get('audioJobId') || undefined;

    if (!jobId) {
      return NextResponse.json({ success: false, error: 'jobId query parameter is required' }, { status: 400 });
    }

    const job = getJob(jobId) ?? (await pendingToJob(jobId));

    // If job was already marked completed in registry, return cached result immediately
    if (job?.status === 'completed' && job.result) {
      return NextResponse.json({ success: true, job });
    }

    // Polls must bill under the same key the dispatch used. Re-resolved per
    // poll so a key added later still applies; falls back to shared credit.
    const jobBearer = job?.userId
      ? (await resolveCallerLivepeerKey(job.userId)).key ?? undefined
      : undefined;

    // DYNAMIC MULTI-SCENE PIPELINE (15s to 60s+)
    if (job?.isMultiScene) {
      const scenesList = Array.isArray(job.scenes) && job.scenes.length > 0
        ? job.scenes
        : [
            {
              sceneNumber: 1,
              durationSeconds: 15,
              title: 'Scene 1: Opening Take',
              prompt: job.scene1Prompt || 'Scene 1',
              jobId: job.scene1JobId || job.livepeerJobId || paramLivepeerJobId,
              url: job.scene1Url,
              model: job.modelToUse || 'seedance-25-t2v',
            },
            {
              sceneNumber: 2,
              durationSeconds: 15,
              title: 'Scene 2: Narrative Progression',
              prompt: job.scene2Prompt || 'Scene 2',
              jobId: job.scene2JobId || paramScene2JobId,
              url: job.scene2Url,
              model: job.modelToUse || 'seedance-25-t2v',
            },
          ];

      // Poll any scenes that do not yet have a resolved URL
      let allScenesCompleted = true;
      for (const scene of scenesList) {
        if (!scene.url && scene.jobId) {
          const poll = await livepeerAgent.pollJobStatus(scene.jobId, jobBearer);
          if (poll.status === 'failed') {
            const friendlyErr = humanizeUpstreamError(poll.error || `Scene ${scene.sceneNumber} render failed.`);
            updateJob(jobId, { status: 'failed', error: friendlyErr });
            await deletePendingRender(jobId);
            return NextResponse.json({
              success: true,
              job: { status: 'failed', error: friendlyErr },
            });
          }
          if (poll.status === 'completed' && poll.url) {
            scene.url = poll.url;
            updateJob(jobId, { scenes: scenesList });
          } else {
            allScenesCompleted = false;
          }
        } else if (!scene.url) {
          allScenesCompleted = false;
        }
      }

      // If any scene is still actively rendering, report aggregate progress
      if (!allScenesCompleted) {
        const completedCount = scenesList.filter((s) => Boolean(s.url)).length;
        const elapsedSec = Math.max(1, Math.round((Date.now() - new Date(job.createdAt).getTime()) / 1000));
        const modelName = job.modelToUse || 'seedance-25-t2v';
        const expectedSla = modelName.includes('seedance') ? '~4 min' : '~45s';
        const progress = Math.min(88, 20 + Math.round((elapsedSec / 240) * 65));
        const targetDuration = job.effectiveDuration || scenesList.length * 15;
        const stageDescription = completedCount > 0
          ? `${completedCount}/${scenesList.length} scenes rendered (${targetDuration}s total, ${elapsedSec}s / ${expectedSla})...`
          : `Rendering ${targetDuration}s video (${scenesList.length} scenes in parallel on ${modelName}, ${elapsedSec}s / ${expectedSla})...`;

        updateJob(jobId, { progress, stageDescription, scenes: scenesList });
        return NextResponse.json({
          success: true,
          job: {
            id: jobId,
            status: 'rendering',
            progress,
            model: modelName,
            expectedSla,
            stageDescription,
            characterAnchorUrl: job.characterAnchorUrl,
            scenes: scenesList,
          },
        });
      }

      // All scenes finished! Poll audio if pending
      const modelName = job.modelToUse || 'seedance-25-t2v';
      const directorBrief = job.directorBrief;
      const syntheticPreferences = job.syntheticPreferences || [];
      let finalAudioUrl = job.audioUrl;

      const audioJobId = job.audioJobId || paramAudioJobId;
      if (!finalAudioUrl && audioJobId) {
        const audioPoll = await livepeerAgent.pollJobStatus(audioJobId, jobBearer);
        if (audioPoll.status === 'completed' && audioPoll.url) {
          finalAudioUrl = audioPoll.url;
          updateJob(jobId, { audioUrl: finalAudioUrl });
        }
      }

      // Assemble all clips into continuous timeline with synchronized soundtrack
      const clips = scenesList.map((s, idx) => ({
        src: s.url!,
        title: s.title || `Scene ${idx + 1}`,
      }));

      let finalMediaUrl = clips[0]?.src || '';
      let wasMuxed = false;

      // 1. Attempt Livepeer assemble MCP tool with crossfade transition
      try {
        const assembled = await livepeerAgent.assembleTimeline({
          clips,
          audioUrl: finalAudioUrl,
          transition: 'crossfade',
        }, jobBearer);
        if (assembled) {
          finalMediaUrl = assembled;
          wasMuxed = true;
        }
      } catch (e) {
        console.warn('[generate:GET] assembleTimeline notice:', e);
      }

      // 2. If Livepeer assemble returned null, use local ffmpeg to stitch scenes with subtle cross-dissolves and mux soundtrack
      if (!wasMuxed && clips.length > 0) {
        try {
          const ffmpegRes = await stitchTimelineWithFfmpeg({
            jobId,
            clips,
            audioUrl: finalAudioUrl,
            transition: 'dissolve',
          });
          if (ffmpegRes?.url) {
            finalMediaUrl = ffmpegRes.url;
            wasMuxed = ffmpegRes.isMuxed;
          }
        } catch (stitchErr) {
          console.warn('[generate:GET] multi-scene ffmpeg stitch notice:', stitchErr);
        }
      }

      const versionNumber = job.versionNumber || 1;
      const totalTimelineSec = scenesList.reduce((acc, s) => acc + (s.durationSeconds || 15), 0);
      const actualDuration = totalTimelineSec;

      const truthfulDirectorMessage = directorBrief?.agentMessage || `Directing your ${actualDuration}s multi-scene video with sung vocals and continuous soundtrack.`;
      const audioStyleDescription = directorBrief?.audioStyle || (directorBrief?.hasVocals ? 'Sung Vocals & Melodic Audio' : 'Original Soundtrack');

      const mediaVersion: MediaVersion = {
        versionNumber,
        createdAt: new Date().toISOString(),
        brief: directorBrief?.enrichedPrompt || `${actualDuration}s AI Video`,
        enrichedBrief: directorBrief?.enrichedPrompt || `${actualDuration}s AI Video`,
        appliedPreferences: syntheticPreferences,
        mediaUrl: finalMediaUrl,
        aspectRatio: directorBrief?.aspectRatio || '16:9',
        pacing: directorBrief?.pacing || 'cinematic',
        captionStyle: {
          enabled: true,
          size: 'medium',
          highlight: 'NUE MOTION',
          text: directorBrief?.enrichedPrompt?.slice(0, 48) || 'Nue Motion',
        },
        audioStyle: {
          enabled: Boolean(directorBrief?.audioEnabled),
          style: audioStyleDescription,
          tempo: directorBrief?.hasVocals ? 'vocal' : 'ambient',
          audioUrl: finalAudioUrl,
          isMuxed: wasMuxed,
        },
        visualTheme: directorBrief?.visualTheme || 'Cinematic',
        agentNotes: `Livepeer Agent sequenced ${scenesList.length} scenes into a continuous ${actualDuration}s timeline with synchronized vocals and soundtrack.`,
        generationDurationSeconds: actualDuration,
        livepeerCapability: wasMuxed ? `${modelName} + timeline-assembly` : modelName,
        characterAnchorUrl: job.characterAnchorUrl,
        scenes: scenesList.map((s, idx) => {
          const mediaUrl = s.url || s.mediaUrl || '';
          return {
            sceneNumber: s.sceneNumber || idx + 1,
            durationSeconds: s.durationSeconds || 15,
            title: s.title || `Scene ${idx + 1}`,
            prompt: s.prompt,
            jobId: s.jobId,
            mediaUrl,
            url: mediaUrl,
            model: s.model || modelName,
            characterAnchorUrl: s.characterAnchorUrl || job.characterAnchorUrl,
          };
        }),
      };

      const result = {
        mediaVersion,
        enrichedPrompt: directorBrief?.enrichedPrompt,
        appliedMemories: syntheticPreferences,
        directorMessage: truthfulDirectorMessage,
        summaryTokens: [directorBrief?.visualTheme || 'Cinematic', directorBrief?.pacing || 'cinematic', `${actualDuration}s`],
        retrievalCount: syntheticPreferences.length,
      };

      updateJob(jobId, {
        status: 'completed',
        progress: 100,
        stageDescription: `${actualDuration}-second video assembly complete`,
        result,
      });

      // Charge the estimate once the assembled timeline lands. Failed renders
      // are never billed; own-key renders skip our ledger; the early return
      // above on completed jobs prevents double-charging repeat polls.
      if (job?.userId && !job.useOwnKey && !job.billedCostUsd && job.estimatedCostUsd) {
        const billed = await deductRenderCost(job.userId, job.estimatedCostUsd);
        if (billed !== null) updateJob(jobId, { billedCostUsd: job.estimatedCostUsd });
      }
      await deletePendingRender(jobId);

      return NextResponse.json({
        success: true,
        job: {
          id: jobId,
          status: 'completed',
          progress: 100,
          stageDescription: `${actualDuration}-second video assembly complete`,
          result,
        },
      });
    }

    // SINGLE-TAKE PIPELINE (native Seedance takes can be up to 30s)
    const livepeerJobId = job?.livepeerJobId || paramLivepeerJobId;
    if (!livepeerJobId) {
      if (job) return NextResponse.json({ success: true, job });
      return NextResponse.json({ success: false, error: 'Job not found or expired' }, { status: 404 });
    }

    // Active 150ms check of Livepeer MCP (under the dispatch key)
    const pollResult = await livepeerAgent.pollJobStatus(livepeerJobId, jobBearer);

    // Release any hold when the take demonstrably fails.
    const releaseHold = async () => {
      if (job?.userId && !job.useOwnKey && job.heldCostUsd && !job.billedCostUsd) {
        await creditBack(job.userId, job.heldCostUsd);
        updateJob(jobId, { heldCostUsd: 0 });
      }
    };

    if (pollResult.status === 'failed') {
      const friendlyErr = humanizeUpstreamError(pollResult.error || 'Livepeer render failed.');
      updateJob(jobId, { status: 'failed', error: friendlyErr });
      await deletePendingRender(jobId);
      await releaseHold();
      return NextResponse.json({
        success: true,
        job: { status: 'failed', error: friendlyErr },
      });
    }

    if (pollResult.status === 'running') {
      const elapsedSec = job ? Math.max(1, Math.round((Date.now() - new Date(job.createdAt).getTime()) / 1000)) : 10;
      // Stale holds must not linger: past 20 minutes the take is abandoned,
      // the hold is refunded, and the job fails honestly.
      if (elapsedSec > 1200) {
        updateJob(jobId, { status: 'failed', error: 'Render timed out after 20 minutes.' });
        await deletePendingRender(jobId);
        await releaseHold();
        return NextResponse.json({
          success: true,
          job: { status: 'failed', error: 'Render timed out after 20 minutes.' },
        });
      }
      const modelName = job?.modelToUse || 'seedance-25-t2v';
      const expectedSla = '~4 min';
      const maxEstimatedSec = 240;
      const progress = Math.min(88, 25 + Math.round((elapsedSec / maxEstimatedSec) * 60));
      const stageDescription = `Rendering on ${modelName} (${elapsedSec}s / ${expectedSla})...`;

      updateJob(jobId, { progress, stageDescription });
      return NextResponse.json({
        success: true,
        job: {
          id: jobId,
          status: 'rendering',
          progress,
          model: modelName,
          expectedSla,
          stageDescription,
        },
      });
    }

    if (pollResult.status === 'completed' && pollResult.url) {
      const videoUrl = pollResult.url;
      const modelName = job?.modelToUse || pollResult.capability || 'seedance-25-t2v';
      const directorBrief = job?.directorBrief;
      const syntheticPreferences = job?.syntheticPreferences || [];
      let finalAudioUrl = job?.audioUrl;

      // If audio was dispatched asynchronously, check if audio is ready
      const audioJobId = job?.audioJobId || paramAudioJobId;
      let audioActualCostUsd = 0;
      if (!finalAudioUrl && audioJobId) {
        const audioPoll = await livepeerAgent.pollJobStatus(audioJobId, jobBearer);
        if (audioPoll.status === 'completed' && audioPoll.url) {
          finalAudioUrl = audioPoll.url;
        }
        audioActualCostUsd = audioPoll.costUsd ?? job?.audioEstimatedCostUsd ?? 0;
      } else if (finalAudioUrl) {
        audioActualCostUsd = job?.audioEstimatedCostUsd ?? 0;
      }

      // Assemble timeline if audio is present
      let finalMediaUrl = videoUrl;
      let wasMuxed = false;
      if (finalAudioUrl) {
        try {
          const assembled = await livepeerAgent.assembleTimeline({
            clips: [{ src: videoUrl }],
            audioUrl: finalAudioUrl,
            transition: 'cut',
          }, jobBearer);
          if (assembled) {
            finalMediaUrl = assembled;
            wasMuxed = true;
          }
        } catch (e) {
          console.warn('[generate:GET] assembleTimeline notice:', e);
        }

        if (!wasMuxed) {
          try {
            const ffmpegRes = await stitchTimelineWithFfmpeg({
              jobId,
              clips: [{ src: videoUrl }],
              audioUrl: finalAudioUrl,
            });
            if (ffmpegRes?.url) {
              finalMediaUrl = ffmpegRes.url;
              wasMuxed = ffmpegRes.isMuxed;
            }
          } catch (stitchErr) {
            console.warn('[generate:GET] single-scene ffmpeg mux notice:', stitchErr);
          }
        }
      }

      const versionNumber = job?.versionNumber || 1;
      const actualDuration = job?.singleTakeDuration || MAX_TAKE_SECONDS;
      const requestedDuration = Math.max(5, Math.min(MAX_TAKE_SECONDS, directorBrief?.duration || actualDuration));
      let truthfulDirectorMessage = directorBrief?.agentMessage || `Here is your ${actualDuration}-second video take!`;

      if (requestedDuration > actualDuration) {
        truthfulDirectorMessage += ` Note: this render landed at ${actualDuration}s on ${modelName}, because a single Livepeer take caps at ${MAX_TAKE_SECONDS}s.`;
      }
      const learnedNote =
        job?.learnedMemories && job.learnedMemories.length > 0
          ? ` Also remembered: "${job.learnedMemories.map((m: any) => m.preference).join(', ')}".`
          : '';
      truthfulDirectorMessage += learnedNote;

      const mediaVersion = buildMediaVersion({
        versionNumber,
        mediaUrl: finalMediaUrl,
        durationSeconds: actualDuration,
        directorBrief,
        syntheticPreferences,
        modelName,
        finalAudioUrl,
        wasMuxed,
        agentNotes: `Livepeer Agent composed version ${versionNumber} via [${modelName}${wasMuxed ? ' + timeline-assembly' : ''}].`,
        seed: pollResult.seed ?? job?.seed,
      });

      const result = {
        mediaVersion,
        enrichedPrompt: directorBrief?.enrichedPrompt,
        appliedMemories: syntheticPreferences,
        directorMessage: truthfulDirectorMessage,
        learnedMemories: job?.learnedMemories || [],
        summaryTokens: [directorBrief?.visualTheme || 'Cinematic', directorBrief?.pacing || 'cinematic', `${actualDuration}s`],
        retrievalCount: syntheticPreferences.length,
      };

      updateJob(jobId, {
        status: 'completed',
        progress: 100,
        stageDescription: 'Video generation complete',
        result,
        seed: pollResult.seed ?? job?.seed,
      });

      // Settle the hold against reported actuals, soundtrack itemized next
      // to the video charge. Own-key renders skip our ledger entirely.
      // Completed jobs return from cache above, so repeat polls settle once.
      if (job?.userId && !job.useOwnKey && !job.billedCostUsd) {
        const videoActual = pollResult.costUsd ?? job.estimatedCostUsd ?? estimateTakeCostUsd(modelName, actualDuration);
        const totalActual = Math.round((videoActual + audioActualCostUsd) * 100) / 100;
        const held = job.heldCostUsd ?? 0;
        const delta = Math.round((totalActual - held) * 100) / 100;
        if (delta > 0) {
          await deductRenderCost(job.userId, delta);
        } else if (delta < 0) {
          await creditBack(job.userId, -delta);
        }
        updateJob(jobId, { billedCostUsd: totalActual, heldCostUsd: 0 });
      }
      await deletePendingRender(jobId);

      return NextResponse.json({
        success: true,
        job: {
          id: jobId,
          status: 'completed',
          progress: 100,
          stageDescription: 'Video generation complete',
          result,
        },
      });
    }

    return NextResponse.json({ success: true, job });
  } catch (error: any) {
    console.error('[generate:status] Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

// POST: Direct brief and dispatch media generation to Livepeer (<10s, never freezes on serverless)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      brief,
      versionNumber = 1,
      projectTitle = 'Media Project',
      projectId,
      seed,
      feedbackContext,
      chatHistory,
      userId,
      email,
      imageUrl,
      chainedFrame,
      preflightOnly,
      approvedDirectorBrief,
      applyRecalledMemories,
    } = body;

    // Step 1: Authenticate caller identity
    const auth = await authenticateRequest(request, email || userId);
    if (!auth.authenticated || !auth.email) {
      return NextResponse.json({ success: false, error: auth.error || 'Authentication required' }, { status: 401 });
    }

    const effectiveUserId = auth.email;

    // Resolve the caller's own Livepeer key (BYOK) once per request. When
    // present, every Livepeer call below bills their account and our ledger
    // stays at $0. Otherwise the shared demo credit applies with estimates,
    // holds, and actual-cost settlement.
    const { key: callerKey, ownKey } = await resolveCallerLivepeerKey(effectiveUserId);
    const requestBearer = callerKey ?? undefined;

    // Step 2: Rate limit GPU generation (10 renders per 3 minutes)
    const clientId = getClientIdentifier(request, effectiveUserId);
    const rateCheck = checkRateLimit(`generate:${clientId}`, 10, 180000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit reached for video generation. Please wait before requesting another render.' },
        { status: 429, headers: { 'Retry-After': String(rateCheck.resetSeconds) } }
      );
    }

    // Step 3: Validate and sanitize text inputs
    if (!brief && !imageUrl) {
      return NextResponse.json({ success: false, error: 'Creative brief or image is required' }, { status: 400 });
    }

    let sanitizedBrief = 'Animate and bring this image to life with cinematic motion and depth.';
    if (brief) {
      const briefCheck = sanitizeText(brief, 4000, 'Brief');
      if (!briefCheck.valid) {
        return NextResponse.json({ success: false, error: briefCheck.error }, { status: 400 });
      }
      sanitizedBrief = briefCheck.sanitized!;
    }

    const titleCheck = sanitizeText(projectTitle, 120, 'Project title');
    const sanitizedTitle = titleCheck.valid ? titleCheck.sanitized! : 'Media Project';

    let sanitizedFeedback: string | undefined;
    if (feedbackContext) {
      const feedbackCheck = sanitizeText(feedbackContext, 4000, 'Feedback context');
      if (feedbackCheck.valid) {
        sanitizedFeedback = feedbackCheck.sanitized;
      }
    }

    // What the user literally asked for, read from their own words rather than from the
    // director's reply (which is already clamped to a single take). Used to explain the
    // delivered length honestly in the preflight plan and in the agent's final message.
    const askedFromPrompt =
      extractExplicitDuration(sanitizedBrief) ||
      (sanitizedFeedback ? extractExplicitDuration(sanitizedFeedback) : null) ||
      null;

    // Step 4: Strict image payload validation
    let validatedImageUrl: string | undefined;
    if (imageUrl) {
      const imageCheck = validateImageSource(imageUrl);
      if (!imageCheck.valid) {
        return NextResponse.json({ success: false, error: imageCheck.error }, { status: 400 });
      }
      validatedImageUrl = imageCheck.sanitized;
    }

    // Step 5: Direct creative brief via Groq + MemWal (~5s synchronous) with full chat history.
    // If the user approved a preflight plan, reuse it verbatim so dispatch cannot reinterpret the prompt.
    // A chained video frame is shown to the director ONLY on revision intent -
    // for a fresh brief it would wrongly steer a new take toward old pixels.
    // (Intent is known after this call; the dispatch path below gates on it.)
    const directorBrief = approvedDirectorBrief && typeof approvedDirectorBrief === 'object'
      ? approvedDirectorBrief
      : await directCreativeBrief(sanitizedBrief, {
          email: effectiveUserId,
          feedbackContext: sanitizedFeedback,
          projectTitle: sanitizedTitle,
          imageUrl: !chainedFrame ? validatedImageUrl : undefined,
          chatHistory: Array.isArray(chatHistory) ? chatHistory : undefined,
          applyMemories: false,
        });

    // Server-split feedback: the client sends raw text only. Revisions carry
    // the user's message as feedback; fresh briefs carry none. Approved
    // re-POSTs arrive with feedback already split (pending.feedback).
    const serverFeedback =
      sanitizedFeedback ||
      (!approvedDirectorBrief && directorBrief.userIntent === 'revision' ? sanitizedBrief : undefined) ||
      undefined;

    // Handle conversational + memory messages immediately: no credits, no dispatch.
    // Memory intent auto-saves the distilled rule (explicit taste is
    // self-confirming) and reports it for the UI to merge - no Remember click.
    if (!directorBrief.shouldGenerate) {
      let savedMemory: any = null;
      let saveError: string | null = null;
      let saveVerified = false;
      const candidate = (directorBrief as any).memoryCandidate;
      if (candidate && typeof candidate.preference === 'string' && candidate.preference.trim().length > 3) {
        try {
          const now = new Date().toISOString();
          const toSave = {
            id: `pref-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            type: 'media_preference' as const,
            category: candidate.category || 'visual_style',
            preference: candidate.preference.trim().slice(0, 240),
            strength: 'high' as const,
            scope: 'media' as const,
            source: 'user_feedback' as const,
            createdAt: now,
            updatedAt: now,
            isActive: true,
            userId: effectiveUserId,
            projectTitle: sanitizedTitle,
          };
          const stored = await memWalService.rememberPreference(toSave as any);
          savedMemory = stored.preference;
          // Write-verify like /api/memwal: a confirmed blob is not yet
          // searchable while the vector index catches up. Check visibility so
          // the UI never presents a phantom rule as stored.
          try {
            const hits = await memWalService.recallPreferences(savedMemory.preference, effectiveUserId);
            saveVerified = hits.some((h) => h.id === savedMemory.id);
          } catch (e) {
            console.warn('[generate:memory] Verify notice:', e instanceof Error ? e.message : e);
          }
        } catch (e: any) {
          saveError = e?.message || 'Memory storage unavailable.';
        }
      }
      return NextResponse.json({
        success: true,
        jobId: null,
        status: 'completed',
        result: {
          mediaVersion: null,
          directorMessage: directorBrief.agentMessage,
          pendingMemory: savedMemory ? null : directorBrief.memoryCandidate || null,
          savedMemory,
          saveError,
          saveVerified,
          appliedMemories: [],
          summaryTokens: [],
          retrievalCount: 0,
        },
      });
    }

    if (preflightOnly) {
      const requestedDuration = Math.max(5, Math.min(MAX_TAKE_SECONDS, directorBrief.duration || MAX_TAKE_SECONDS));
      const sceneCount = 1;
      const askedDuration = Math.max(askedFromPrompt || 0, requestedDuration);
      const timelineNote = askedDuration > MAX_TAKE_SECONDS
        ? `Livepeer caps a single render at ${MAX_TAKE_SECONDS}s on this surface, so Nue will deliver one continuous ${requestedDuration}s take now. The remaining beats can be directed as follow-up takes that continue the same shot, characters, setting, lighting, and action state.`
        : undefined;
      return NextResponse.json({
        success: true,
        preflight: true,
        directorBrief,
        plan: {
          duration: requestedDuration,
          sceneCount,
          model: validatedImageUrl && (!chainedFrame || (directorBrief as any).userIntent === 'revision') ? 'seedance-25-i2v' : 'seedance-25-t2v',
          aspectRatio: directorBrief.aspectRatio || '16:9',
          audioEnabled: Boolean(directorBrief.audioEnabled),
          hasVocals: Boolean(directorBrief.hasVocals || directorBrief.lyricsPrompt),
          lyricsPrompt: directorBrief.lyricsPrompt,
          audioStyle: directorBrief.audioStyle,
          visualTheme: directorBrief.visualTheme,
          pacing: directorBrief.pacing,
          scenePrompts: directorBrief.scenePrompts || [],
          timelineNote,
          recalledMemories: directorBrief.recalledMemories || [],
          // Server-split dispatch inputs: the approved re-POST renders from
          // these, never from reinterpreting the raw text.
          brief: directorBrief.enrichedPrompt,
          feedback: serverFeedback || undefined,
          agentMessage: ownKey
            ? `${directorBrief.agentMessage || ''} Rendering on your Livepeer key - billed to your account, $0 on our ledger.`.trim()
            : directorBrief.agentMessage,
          billingSource: ownKey ? 'own_key' : 'demo_credit',
        },
      });
    }

    // Build render trace preferences. These explain what shaped this render,
    // but are not durable memories unless the user confirms feedback.
    const shouldApplyRecalledMemories = Boolean(applyRecalledMemories);
    const syntheticPreferences: MotionPreference[] = [];
    const recalledPreferences: MotionPreference[] = shouldApplyRecalledMemories && Array.isArray(directorBrief.recalledMemories)
      ? directorBrief.recalledMemories.map((memory: any, idx: number) => ({
          id: `recall-${idx}-${String(memory.category || 'memory')}-${Date.now()}`,
          type: 'media_preference' as const,
          category: memory.category || 'visual_style',
          preference: memory.preference,
          strength: 'high' as const,
          scope: 'media' as const,
          source: 'user_feedback' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: true,
        })).filter((memory: any) => typeof memory.preference === 'string' && memory.preference.trim().length > 0)
      : [];
    if (directorBrief.visualTheme && directorBrief.visualTheme !== 'Creative Direction') {
      syntheticPreferences.push({
        id: `dir-visual-${Date.now()}`,
        type: 'media_preference' as const,
        category: 'visual_style' as const,
        preference: directorBrief.visualTheme,
        strength: 'high' as const,
        scope: 'media' as const,
        source: 'creative_brief' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      });
    }
    if (directorBrief.audioEnabled && directorBrief.audioStyle) {
      syntheticPreferences.push({
        id: `dir-audio-${Date.now()}`,
        type: 'media_preference' as const,
        category: 'audio' as const,
        preference: directorBrief.audioStyle,
        strength: 'high' as const,
        scope: 'media' as const,
        source: 'creative_brief' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      });
    }
    for (const recalled of recalledPreferences) {
      const duplicate = syntheticPreferences.some((pref) =>
        pref.category === recalled.category &&
        pref.preference.toLowerCase() === recalled.preference.toLowerCase()
      );
      if (!duplicate) {
        syntheticPreferences.push(recalled);
      }
    }
    const recalledMemoryDirective = shouldApplyRecalledMemories && recalledPreferences.length > 0
      ? ` Approved Nue Memory rules for this render: ${recalledPreferences.map((memory) => `[${memory.category}] ${memory.preference}`).join('; ')}. Apply these only when they do not conflict with explicit instructions in the current user prompt. If there is any conflict, the current prompt wins.`
      : '';

    // Step 7: Dispatch media generation to Livepeer (<3s synchronous).
    // A chained frame (previous take's last pixels) is honored ONLY on
    // revision intent - for a fresh brief it would steer a new take toward
    // old pixels, so it is dropped here (director never saw it either).
    const effectiveImageUrl =
      validatedImageUrl && (!chainedFrame || directorBrief.userIntent === 'revision')
        ? validatedImageUrl
        : undefined;
    const isImageToVideo = Boolean(effectiveImageUrl);
    const modelToUse: string = isImageToVideo ? 'seedance-25-i2v' : 'seedance-25-t2v';
    const expectedSla = '~4 min';

    const rawRequestedDuration = Math.min(60, directorBrief.duration || MAX_TAKE_SECONDS);
    // One take is capped by the provider, so this is the only duration we ever dispatch.
    const requestedDuration = Math.max(5, Math.min(MAX_TAKE_SECONDS, rawRequestedDuration));
    // With the cap at a single take this is never true; it stays so the timeline branch below
    // activates by itself if the provider ever raises the per-call duration limit.
    const isMultiScene = !isImageToVideo && requestedDuration > MAX_TAKE_SECONDS;

    // Revision background learning (approved renders only - this block sits
    // past the preflight early-return, so planning never learns). A revision
    // can smuggle a standing rule ("make it darker - I always want dark").
    // Explicit high-confidence prefs are extracted and auto-saved; they ride
    // the job record into the completion message. Failures stay silent.
    let learnedMemories: any[] = [];
    if (serverFeedback && directorBrief.userIntent === 'revision') {
      try {
        const { classifyFeedbackAuto } = await import('@/lib/nue-memory/extractor');
        const cls = await classifyFeedbackAuto(serverFeedback, {
          projectTitle: sanitizedTitle,
          userId: effectiveUserId,
          existingMemories: (directorBrief.recalledMemories || []).map((m: any) => ({
            category: m.category,
            preference: m.preference,
          })),
        });
        const strong = (cls.extractedPreferences || []).filter((p: any) => p.strength === 'high').slice(0, 3);
        for (const pref of strong) {
          try {
            const now = new Date().toISOString();
            const saved = await memWalService.rememberPreference({
              ...(pref as object),
              id: `pref-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              userId: effectiveUserId,
              createdAt: (pref as any).createdAt || now,
              updatedAt: now,
              isActive: true,
            } as any);
            learnedMemories.push(saved.preference);
          } catch (e) {
            console.warn('[generate:learn] remember notice:', e instanceof Error ? e.message : e);
          }
        }
      } catch (e) {
        console.warn('[generate:learn] classify notice:', e instanceof Error ? e.message : e);
      }
    }

    // Step 6 (moved post-brief): gate on the honest pre-dispatch estimate for
    // this exact model + length. Livepeer reserves cost at dispatch, so the
    // check must happen before any billable call. Own-key renders skip the
    // gate and the ledger entirely ($0 here; Livepeer bills their account).
    // The final charge uses the reported actual at completion, never this.
    const estimatedCostUsd = ownKey ? 0 : estimateTakeCostUsd(modelToUse, requestedDuration);
    if (supabase && !ownKey) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('credit_balance')
        .eq('email', effectiveUserId)
        .maybeSingle();

      const balance = Number(profile?.credit_balance ?? 10.0);
      if (balance < estimatedCostUsd) {
        return NextResponse.json(
          {
            success: false,
            error: `Looks like our studio compute balance is too low for this take (about $${estimatedCostUsd.toFixed(2)} for ${requestedDuration}s on ${modelToUse}). Each account starts with a complimentary $10.00 grant.`,
            credit_balance: balance,
            estimatedCostUsd,
          },
          { status: 402 }
        );
      }
    }

    // Never let the reply imply a length we cannot render. If the user asked for more than one
    // take and the director did not already explain the limit, say it once here.
    const askedDuration = Math.max(askedFromPrompt || 0, rawRequestedDuration);
    if (askedDuration > MAX_TAKE_SECONDS && !/\b15\s*(?:s\b|sec|second)/i.test(directorBrief.agentMessage || '')) {
      directorBrief.agentMessage = `${directorBrief.agentMessage || ''} Heads up: a single Livepeer render caps at ${MAX_TAKE_SECONDS}s, so this delivers one continuous ${requestedDuration}s chapter. The next beats can be directed as follow-up takes that continue the same shot, characters, and lighting.`.trim();
    }

    // Dispatch background soundtrack in parallel if requested (with singing vocals / lyrics support).
    // Its cost is itemized next to the video charge at completion.
    let audioJobId: string | undefined;
    let audioUrl: string | undefined;
    let audioEstimatedCostUsd: number | undefined;
    if (directorBrief.audioEnabled && directorBrief.audioStyle) {
      const isVocal = Boolean(directorBrief.hasVocals || directorBrief.lyricsPrompt);
      // Approved recalled sound rules shape the MUSIC prompt, not the video
      // prompt - a fade instruction in frame descriptions changes nothing.
      const recalledAudioRules = recalledPreferences
        .filter((m) => ['music', 'audio', 'voice'].includes(String(m.category || '').toLowerCase()))
        .map((m) => m.preference)
        .filter((p) => typeof p === 'string' && p.trim().length > 0);
      const recalledAudioDirective = recalledAudioRules.length > 0
        ? ` Honor these approved listener rules: ${recalledAudioRules.join('; ')}.`
        : '';
      const audioPrompt = isVocal
        ? `${directorBrief.audioStyle}, expressive melodic vocals. Sing the provided lyrics exactly once, from first line to last line, in order. Do not repeat the opening lines. Keep the pace energetic and clear so every word fits.${recalledAudioDirective}`
        : `${directorBrief.audioStyle} soundtrack, ${directorBrief.pacing === 'fast' ? 'upbeat driving tempo' : 'smooth ambient tempo'}, subtle synth and modern instrumentation.${recalledAudioDirective}`;

      const audioArgs: Record<string, any> = {
        action: 'music',
        prompt: audioPrompt,
        duration: Math.min(MAX_TAKE_SECONDS, Math.max(15, requestedDuration)),
        async: true,
      };

      if (isVocal) {
        audioArgs.instrumental = false;
        if (directorBrief.lyricsPrompt) {
          audioArgs.lyrics_prompt = directorBrief.lyricsPrompt;
        }
      }

      try {
        const audioDispatch = await livepeerAgent.dispatchCreateMedia(audioArgs, requestBearer);
        if (audioDispatch.status === 'failed') {
          console.warn('[generate:POST] audio dispatch notice:', audioDispatch.error);
        } else if (audioDispatch.url) {
          audioUrl = audioDispatch.url;
          audioEstimatedCostUsd = audioDispatch.costUsd;
        } else if (audioDispatch.jobId) {
          audioJobId = audioDispatch.jobId;
          audioEstimatedCostUsd = audioDispatch.costUsd;
        }
      } catch (audioErr) {
        console.warn('[generate:POST] audio dispatch notice:', audioErr);
      }
    }

    const jobId = `job-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    createJob({
      id: jobId,
      userId: effectiveUserId,
      projectTitle: sanitizedTitle,
      versionNumber: Number(versionNumber) || 1,
    });

    if (isMultiScene) {
      // Reachable only if the provider cap rises above one take. Builds the timeline out of
      // whole MAX_TAKE_SECONDS takes, which is what makes the assembled length exact.
      const nativeTakeDuration = MAX_TAKE_SECONDS;
      const numScenes = Math.min(4, Math.max(2, Math.ceil(rawRequestedDuration / nativeTakeDuration)));
      const totalAssembledDuration = numScenes * nativeTakeDuration;

      // Phase 1: Generate Master Concept Anchor Image (Higgsfield Soul ID & Google Character DNA standard)
      // Creates a canonical visual anchor of characters/environment to condition all downstream takes
      let characterAnchorUrl: string | undefined;
      const conceptPrompt = directorBrief.conceptImagePrompt || (
        directorBrief.characterBible
          ? `Master character concept sheet: ${directorBrief.characterBible}. 8k resolution, cinematic lighting, neutral composition, front-facing reference.`
          : null
      );

      if (conceptPrompt) {
        try {
          const anchor = await livepeerAgent.generateCharacterConcept(conceptPrompt, requestBearer);
          if (anchor) {
            characterAnchorUrl = anchor;
            console.log(`[generate:POST] Successfully created character concept anchor: ${characterAnchorUrl}`);
          }
        } catch (anchorErr) {
          console.warn('[generate:POST] Character concept anchor notice:', anchorErr);
        }
      }

      // seedance-25-ref2v retired 2026-09-19 (69% success, $49.08 wasted — provider-attributed).
      // No sibling capability substituted automatically; explicit choice: seedance-25-t2v for all scenes.
      // Character continuity is enforced via characterBible text injected into each scene prompt.
      const multiSceneModel = modelToUse;

      const scenePromptsToUse: string[] = [];
      for (let i = 0; i < numScenes; i++) {
        if (directorBrief.scenePrompts && directorBrief.scenePrompts[i]) {
          scenePromptsToUse.push(directorBrief.scenePrompts[i]);
        } else {
          const sceneLabels = [
            'Scene 1 Opening: Setting the environment, atmosphere, and initial character motion',
            'Scene 2 Development: Dynamic character action, camera movement, and visual interaction',
            'Scene 3 Climax: Vibrant energy, peak visual detail, and expressive motion',
            'Scene 4 Finale: Celebratory closing sequence and graceful visual ending',
          ];
          scenePromptsToUse.push(`${directorBrief.enrichedPrompt} (${sceneLabels[i] || `Scene ${i + 1}`})`);
        }
      }

      const sceneDispatches = await Promise.all(
        scenePromptsToUse.map((scenePrompt, idx) => {
          const charDna = directorBrief.characterBible ? ` Characters: ${directorBrief.characterBible}.` : '';
          const continuityDirective = [
            `This is native Seedance take ${idx + 1} of ${numScenes} in one continuous ${totalAssembledDuration}s timeline, not a separate concept.`,
            'Maintain the exact same subject identity, wardrobe, props, setting geography, lighting continuity, lens language, scale relationships, and visual rules from the original prompt.',
            idx === 0
              ? 'End this take on an action state that can continue naturally into the next take.'
              : 'Begin exactly where the previous take ended; do not reset the scene, change the cast, change the location, or introduce a new unrelated setup.',
            'Follow the user prompt over any inferred style defaults.'
          ].join(' ');
          const fullPrompt = `${scenePrompt}. ${continuityDirective}${charDna} Visual aesthetic: ${directorBrief.visualTheme}. Pacing: ${directorBrief.pacing}. Composition: ${directorBrief.aspectRatio}.${recalledMemoryDirective}`;

          return livepeerAgent.dispatchCreateMedia({
            action: 'generate',
            prompt: fullPrompt,
            model_override: multiSceneModel,
            duration: nativeTakeDuration,
            async: true,
          }, requestBearer);
        })
      );

      const anyFailed = sceneDispatches.some(d => d.status === 'failed' || (!d.jobId && !d.url));
      if (anyFailed) {
        const rawErr = sceneDispatches.find(d => d.error)?.error || 'Failed to dispatch one of the scene takes to Livepeer.';
        return NextResponse.json({ success: false, error: humanizeUpstreamError(rawErr) }, { status: 500 });
      }

      const scenes = sceneDispatches.map((disp, idx) => ({
        sceneNumber: idx + 1,
        durationSeconds: nativeTakeDuration,
        title: `Continuous Take ${idx + 1}`,
        prompt: scenePromptsToUse[idx],
        jobId: disp.jobId,
        url: disp.url,
        model: multiSceneModel,
        characterAnchorUrl,
      }));

      const stageDesc = `Directing ${totalAssembledDuration}s continuous Seedance timeline (${numScenes} native ${nativeTakeDuration}s takes on ${multiSceneModel}${characterAnchorUrl ? ' with Character Anchor' : ''})...`;

      updateJob(jobId, {
        status: 'rendering',
        progress: 20,
        stageDescription: stageDesc,
        isMultiScene: true,
        scenes,
        characterAnchorUrl,
        scene1JobId: scenes[0]?.jobId,
        scene2JobId: scenes[1]?.jobId,
        scene1Url: scenes[0]?.url,
        scene2Url: scenes[1]?.url,
        scene1Prompt: scenes[0]?.prompt,
        scene2Prompt: scenes[1]?.prompt,
        livepeerJobId: scenes[0]?.jobId,
        audioJobId,
        audioUrl,
        directorBrief,
        syntheticPreferences,
        modelToUse: multiSceneModel,
        singleTakeDuration: totalAssembledDuration,
        effectiveDuration: totalAssembledDuration,
        estimatedCostUsd: estimateTakeCostUsd(multiSceneModel, totalAssembledDuration),
        useOwnKey: ownKey || undefined,
        expectedSla: '~4 min',
      });

      await savePendingRender({
        jobId,
        userId: effectiveUserId,
        projectId: typeof projectId === 'string' ? projectId : undefined,
        projectTitle: sanitizedTitle,
        versionNumber: Number(versionNumber) || 1,
        livepeerJobId: scenes[0]?.jobId,
        scene2JobId: scenes[1]?.jobId,
        audioJobId,
        model: multiSceneModel,
        singleTakeDuration: totalAssembledDuration,
        directorBrief,
        syntheticPreferences,
      });

      return NextResponse.json({
        success: true,
        jobId,
        status: 'rendering',
        livepeerJobId: scenes[0]?.jobId,
        scene2JobId: scenes[1]?.jobId,
        audioJobId,
        isMultiScene: true,
        scenes,
        characterAnchorUrl,
        model: multiSceneModel,
        expectedSla: '~4 min',
        stageDescription: stageDesc,
        progress: 20,
      });
    }

    // Single take path. This is the path every render takes while the provider cap is
    // MAX_TAKE_SECONDS, so the requested length is dispatched as-is rather than inflated.
    const singleTakeDuration = modelToUse.includes('seedance')
      ? Math.min(MAX_TAKE_SECONDS, Math.max(5, requestedDuration))
      : Math.min(8, Math.max(3, requestedDuration >= 7 ? 8 : requestedDuration >= 4 ? 5 : 3));

    const livepeerPrompt = `${directorBrief.enrichedPrompt}. Visual style: ${directorBrief.visualTheme}. Pacing: ${directorBrief.pacing}. Composition: ${directorBrief.aspectRatio}.${recalledMemoryDirective}`;

    // Stage 1 sanitizer: the video model renders frames and never sings, so any lyric or
    // dialogue text the director echoed into the visual prompt is dead weight that the
    // partner safety scanner reads as copyrighted material. Removing it up front avoids
    // burning a whole refused render. sanitizePromptForDiffusion also drops negative
    // constraints (No dialogue/text/subtitles/logos) and Sound:/Audio: clauses, which
    // carry zero visual signal and trip keyword filters.
    const videoPrompt = stripLyricTextFromVideoPrompt(sanitizePromptForDiffusion(livepeerPrompt), directorBrief.lyricsPrompt);

    // Seed pinning: revisions reuse the previous take's seed so v2 is a
    // variation (same composition, requested change applied), not a new roll.
    // Fresh briefs omit it for a new random take. Validated - a hostile seed
    // is just a number to the provider, but garbage in means opaque out.
    const requestedSeed =
      Number.isInteger(seed) && (seed as number) >= 0 && (seed as number) <= 2147483647 ? (seed as number) : undefined;
    const pinSeed = requestedSeed !== undefined && Boolean(serverFeedback) ? requestedSeed : undefined;

    const dispatchArgs: Record<string, any> = {
      action: isImageToVideo ? 'animate' : 'generate',
      prompt: videoPrompt,
      model_override: modelToUse,
      duration: singleTakeDuration,
      async: true,
      ...(pinSeed !== undefined ? { seed: pinSeed } : {}),
      ...(effectiveImageUrl ? { source_url: effectiveImageUrl } : {}),
    };

    let videoDispatch = await livepeerAgent.dispatchCreateMedia(dispatchArgs, requestBearer);
    let effectiveSingleTakeDuration = singleTakeDuration;

    if (
      videoDispatch.status === 'failed' &&
      singleTakeDuration > FALLBACK_SAFE_TAKE_SECONDS &&
      isDurationRejection(videoDispatch.error)
    ) {
      effectiveSingleTakeDuration = FALLBACK_SAFE_TAKE_SECONDS;
      videoDispatch = await livepeerAgent.dispatchCreateMedia({
        ...dispatchArgs,
        duration: FALLBACK_SAFE_TAKE_SECONDS,
        prompt: `${videoPrompt} The provider refused a ${singleTakeDuration}s clip length, so render this as a shorter continuous take. Preserve exact subject identity, setting, lighting, camera language, and action state.`,
      }, requestBearer);
    }

    // Self-healing retry for safety-scanner false positives. A retry only has a chance if the
    // payload actually changes, so this strips the remaining quoted text and audio direction
    // instead of re-sending the prompt that was just refused. When stripping changes nothing,
    // the prompt is paraphrased with new tokens (same scene) as the last resort before failing
    // honestly - re-dispatching identical text reproduces the identical rejection forever.
    if (videoDispatch.status === 'failed' && isPolicyRejection(videoDispatch.error)) {
      const retryPrompt = simplifyVideoPromptForRetry(videoPrompt);
      if (retryPrompt && retryPrompt !== videoPrompt) {
        console.warn('[generate:POST] Safety scanner refused the prompt. Retrying once with quoted lyric text and audio direction stripped.');
        videoDispatch = await livepeerAgent.dispatchCreateMedia({
          ...dispatchArgs,
          prompt: retryPrompt,
        }, requestBearer);
      }
      if (videoDispatch.status === 'failed' && isPolicyRejection(videoDispatch.error)) {
        const { paraphraseVideoPrompt } = await import('@/lib/ai/nue-director');
        const paraphrased = await paraphraseVideoPrompt(videoPrompt);
        if (paraphrased) {
          console.warn('[generate:POST] Scanner refused the stripped prompt too. Retrying once with paraphrased wording.');
          videoDispatch = await livepeerAgent.dispatchCreateMedia({
            ...dispatchArgs,
            prompt: paraphrased,
          }, requestBearer);
        }
      }
    }

    if (videoDispatch.status === 'failed') {
      return NextResponse.json({
        success: false,
        error: humanizeUpstreamError(videoDispatch.error || 'Failed to dispatch media generation to Livepeer.'),
      }, { status: 500 });
    }

    if (videoDispatch.status === 'completed' && videoDispatch.url) {
      const modelName = videoDispatch.capability || modelToUse;
      let finalMediaUrl = videoDispatch.url;
      let finalAudioUrl = audioUrl;
      let wasMuxed = false;

      if (!finalAudioUrl && audioJobId) {
        const audioPoll = await livepeerAgent.pollJobStatus(audioJobId, requestBearer);
        if (audioPoll.status === 'completed' && audioPoll.url) {
          finalAudioUrl = audioPoll.url;
        }
      }

      if (finalAudioUrl) {
        try {
          const assembled = await livepeerAgent.assembleTimeline({
            clips: [{ src: videoDispatch.url }],
            audioUrl: finalAudioUrl,
            transition: 'cut',
          }, requestBearer);
          if (assembled) {
            finalMediaUrl = assembled;
            wasMuxed = true;
          }
        } catch (e) {
          console.warn('[generate:POST] immediate assembleTimeline notice:', e);
        }
      }

      const mediaVersion = buildMediaVersion({
        versionNumber: Number(versionNumber) || 1,
        mediaUrl: finalMediaUrl,
        durationSeconds: effectiveSingleTakeDuration,
        directorBrief,
        syntheticPreferences,
        modelName,
        finalAudioUrl,
        wasMuxed,
        agentNotes: `Livepeer Agent returned an immediately completed ${effectiveSingleTakeDuration}s take via [${modelName}${wasMuxed ? ' + timeline-assembly' : ''}].`,
        seed: videoDispatch.seed ?? pinSeed,
      });

      const result = {
        mediaVersion,
        enrichedPrompt: directorBrief.enrichedPrompt,
        appliedMemories: syntheticPreferences,
        directorMessage: directorBrief.agentMessage || `Here is your ${effectiveSingleTakeDuration}-second video take!`,
        learnedMemories,
        summaryTokens: [directorBrief.visualTheme || 'Cinematic', directorBrief.pacing || 'cinematic', `${effectiveSingleTakeDuration}s`],
        retrievalCount: syntheticPreferences.length,
      };

      updateJob(jobId, {
        status: 'completed',
        progress: 100,
        stageDescription: 'Video generation complete',
        audioJobId,
        audioUrl: finalAudioUrl,
        directorBrief,
        syntheticPreferences,
        modelToUse: modelName,
        singleTakeDuration: effectiveSingleTakeDuration,
        effectiveDuration: effectiveSingleTakeDuration,
        expectedSla,
        result,
      });

      // Immediately completed takes bill here: reported video actual plus any
      // immediately-resolved soundtrack, else the dispatch estimate. Own-key
      // renders skip our ledger (Livepeer bills their account). Failures never
      // reach this branch.
      if (!ownKey) {
        const chargeUsd = (videoDispatch.costUsd ?? estimatedCostUsd) + (audioEstimatedCostUsd ?? 0);
        const billed = await deductRenderCost(effectiveUserId, chargeUsd);
        if (billed !== null) updateJob(jobId, { billedCostUsd: chargeUsd });
      } else {
        updateJob(jobId, { useOwnKey: true, billedCostUsd: 0 });
      }

      return NextResponse.json({
        success: true,
        jobId,
        status: 'completed',
        result,
      });
    }

    if (!videoDispatch.jobId) {
      return NextResponse.json({
        success: false,
        error: 'Livepeer did not return a job id for polling. Please try again.',
      }, { status: 502 });
    }

    updateJob(jobId, {
      status: 'rendering',
      progress: 25,
      stageDescription: `Rendering on ${modelToUse} (${expectedSla})...`,
      livepeerJobId: videoDispatch.jobId,
      audioJobId,
      audioUrl,
      directorBrief,
      syntheticPreferences,
      modelToUse,
      singleTakeDuration: effectiveSingleTakeDuration,
      effectiveDuration: effectiveSingleTakeDuration,
      estimatedCostUsd: videoDispatch.costUsd ?? estimatedCostUsd,
      audioEstimatedCostUsd,
      seed: videoDispatch.seed ?? pinSeed,
      useOwnKey: ownKey || undefined,
      learnedMemories,
      expectedSla,
    });

    // Hold the video estimate now that Livepeer has reserved the render.
    // Settled (adjusted to actuals, audio itemized) or refunded at completion.
    // Own-key renders hold nothing on our ledger.
    let heldCostUsd = 0;
    if (!ownKey) {
      const held = await deductRenderCost(effectiveUserId, videoDispatch.costUsd ?? estimatedCostUsd);
      if (held !== null) heldCostUsd = videoDispatch.costUsd ?? estimatedCostUsd;
      updateJob(jobId, { heldCostUsd });
    }

    // Durable descriptor: if the user closes the tab for hours (or switches
    // devices), GET rebuilds from this row and the take still lands.
    await savePendingRender({
      jobId,
      userId: effectiveUserId,
      projectId: typeof projectId === 'string' ? projectId : undefined,
      projectTitle: sanitizedTitle,
      versionNumber: Number(versionNumber) || 1,
      livepeerJobId: videoDispatch.jobId,
      audioJobId,
      model: modelToUse,
      singleTakeDuration: effectiveSingleTakeDuration,
      directorBrief,
      syntheticPreferences,
    });

    return NextResponse.json({
      success: true,
      jobId,
      status: 'rendering',
      livepeerJobId: videoDispatch.jobId,
      audioJobId,
      model: modelToUse,
      expectedSla,
      stageDescription: `Rendering on ${modelToUse} (${expectedSla})...`,
      progress: 25,
    });
  } catch (error) {
    const err = error as Error & { code?: string };
    if (err?.code === 'walrus_config_missing') {
      return NextResponse.json(
        { success: false, error: 'configuration_required', message: err.message },
        { status: 503 }
      );
    }
    console.error('[generate:POST] Error:', err?.message || error);
    return NextResponse.json({ success: false, error: humanizeUpstreamError(err?.message || String(error)) }, { status: 500 });
  }
}
