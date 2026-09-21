import { NextResponse } from 'next/server';
import { directCreativeBrief, humanizeUpstreamError } from '@/lib/ai/nue-director';
import { livepeerAgent } from '@/lib/livepeer/agent';
import { supabase } from '@/lib/supabase/client';
import { checkRateLimit, getClientIdentifier } from '@/lib/security/rate-limit';
import { sanitizeText, validateImageSource } from '@/lib/security/sanitize';
import { authenticateRequest } from '@/lib/auth/server';
import { createJob, getJob, updateJob } from '@/lib/jobs/registry';
import { MediaPreference, MediaVersion } from '@/lib/types';
import { stitchTimelineWithFfmpeg } from '@/lib/media/timeline-stitcher';

export const runtime = 'nodejs';
export const maxDuration = 300;

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
    characterAnchorUrl: directorBrief?.characterAnchorUrl,
    scenes: params.scenes,
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

    const job = getJob(jobId);

    // If job was already marked completed in registry, return cached result immediately
    if (job?.status === 'completed' && job.result) {
      return NextResponse.json({ success: true, job });
    }

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
          const poll = await livepeerAgent.pollJobStatus(scene.jobId);
          if (poll.status === 'failed') {
            const friendlyErr = humanizeUpstreamError(poll.error || `Scene ${scene.sceneNumber} render failed.`);
            updateJob(jobId, { status: 'failed', error: friendlyErr });
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
        const audioPoll = await livepeerAgent.pollJobStatus(audioJobId);
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
        });
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

    // SINGLE-SCENE PIPELINE (duration <= 15)
    const livepeerJobId = job?.livepeerJobId || paramLivepeerJobId;
    if (!livepeerJobId) {
      if (job) return NextResponse.json({ success: true, job });
      return NextResponse.json({ success: false, error: 'Job not found or expired' }, { status: 404 });
    }

    // Active 150ms check of Livepeer MCP
    const pollResult = await livepeerAgent.pollJobStatus(livepeerJobId);

    if (pollResult.status === 'failed') {
      const friendlyErr = humanizeUpstreamError(pollResult.error || 'Livepeer render failed.');
      updateJob(jobId, { status: 'failed', error: friendlyErr });
      return NextResponse.json({
        success: true,
        job: { status: 'failed', error: friendlyErr },
      });
    }

    if (pollResult.status === 'running') {
      const elapsedSec = job ? Math.max(1, Math.round((Date.now() - new Date(job.createdAt).getTime()) / 1000)) : 10;
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
      if (!finalAudioUrl && audioJobId) {
        const audioPoll = await livepeerAgent.pollJobStatus(audioJobId);
        if (audioPoll.status === 'completed' && audioPoll.url) {
          finalAudioUrl = audioPoll.url;
        }
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
          });
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
      const actualDuration = job?.singleTakeDuration || 15;
      const requestedDuration = directorBrief?.duration || actualDuration;
      let truthfulDirectorMessage = directorBrief?.agentMessage || `Here is your ${actualDuration}-second video take!`;

      if (actualDuration >= 24 || actualDuration >= requestedDuration) {
        truthfulDirectorMessage = truthfulDirectorMessage
          .replace(/\b8[- ]seconds?\b/gi, `${actualDuration}-second`)
          .replace(/\b8s\b/gi, `${actualDuration}s`);
      } else if (requestedDuration > actualDuration) {
        truthfulDirectorMessage = truthfulDirectorMessage
          .replace(/\b\d+[- ]seconds?\b/gi, `${actualDuration}-second`)
          .replace(/\b\d+s\b/gi, `${actualDuration}s`);
        truthfulDirectorMessage += ` Note: Rendered a ${actualDuration}s take on ${modelName}.`;
      }

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
      });

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
        stageDescription: 'Video generation complete',
        result,
      });

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
      feedbackContext,
      chatHistory,
      userId,
      email,
      imageUrl,
      preflightOnly,
      approvedDirectorBrief,
    } = body;

    // Step 1: Authenticate caller identity
    const auth = await authenticateRequest(request, email || userId);
    if (!auth.authenticated || !auth.email) {
      return NextResponse.json({ success: false, error: auth.error || 'Authentication required' }, { status: 401 });
    }

    const effectiveUserId = auth.email;

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
    const directorBrief = approvedDirectorBrief && typeof approvedDirectorBrief === 'object'
      ? approvedDirectorBrief
      : await directCreativeBrief(sanitizedBrief, {
          email: effectiveUserId,
          feedbackContext: sanitizedFeedback,
          projectTitle: sanitizedTitle,
          imageUrl: validatedImageUrl,
          chatHistory: Array.isArray(chatHistory) ? chatHistory : undefined,
        });

    // Handle conversational messages immediately without requiring credits or dispatching media
    if (!directorBrief.shouldGenerate) {
      return NextResponse.json({
        success: true,
        jobId: null,
        status: 'completed',
        result: {
          mediaVersion: null,
          directorMessage: directorBrief.agentMessage,
          appliedMemories: [],
          summaryTokens: [],
          retrievalCount: 0,
        },
      });
    }

    if (preflightOnly) {
      const requestedDuration = directorBrief.duration || 15;
      const sceneCount = !validatedImageUrl && requestedDuration > 15
        ? Math.min(4, Math.max(2, Math.ceil(requestedDuration / 15)))
        : 1;
      return NextResponse.json({
        success: true,
        preflight: true,
        directorBrief,
        plan: {
          duration: requestedDuration,
          sceneCount,
          model: validatedImageUrl ? 'seedance-25-i2v' : 'seedance-25-t2v',
          aspectRatio: directorBrief.aspectRatio || '16:9',
          audioEnabled: Boolean(directorBrief.audioEnabled),
          hasVocals: Boolean(directorBrief.hasVocals || directorBrief.lyricsPrompt),
          lyricsPrompt: directorBrief.lyricsPrompt,
          audioStyle: directorBrief.audioStyle,
          visualTheme: directorBrief.visualTheme,
          pacing: directorBrief.pacing,
          scenePrompts: directorBrief.scenePrompts || [],
          recalledMemories: directorBrief.recalledMemories || [],
          agentMessage: directorBrief.agentMessage,
        },
      });
    }

    // Step 6: Verify credit balance in Supabase before dispatching compute
    if (supabase) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('credit_balance')
        .eq('email', effectiveUserId)
        .maybeSingle();

      const balance = Number(profile?.credit_balance ?? 10.0);
      if (balance < 0.05) {
        return NextResponse.json(
          {
            success: false,
            error: 'Looks like our studio compute balance is running low ($0.05 needed for a render). Top up your credits and we will keep cooking!',
            credit_balance: balance,
          },
          { status: 402 }
        );
      }
    }

    // Build render trace preferences. These explain what shaped this render,
    // but are not durable memories unless the user confirms feedback.
    const syntheticPreferences: MediaPreference[] = [];
    const recalledPreferences = Array.isArray(directorBrief.recalledMemories)
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
        source: 'user_feedback' as const,
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
        source: 'user_feedback' as const,
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

    // Step 7: Dispatch media generation to Livepeer (<3s synchronous)
    const isImageToVideo = Boolean(validatedImageUrl);
    const modelToUse: string = isImageToVideo ? 'seedance-25-i2v' : 'seedance-25-t2v';
    const expectedSla = '~4 min';

    const requestedDuration = directorBrief.duration || 15;
    const isMultiScene = !isImageToVideo && requestedDuration > 15;

    // Dispatch background soundtrack in parallel if requested (with singing vocals / lyrics support)
    let audioJobId: string | undefined;
    let audioUrl: string | undefined;
    if (directorBrief.audioEnabled && directorBrief.audioStyle) {
      const isVocal = Boolean(directorBrief.hasVocals || directorBrief.lyricsPrompt);
      const audioPrompt = isVocal
        ? `${directorBrief.audioStyle}, expressive melodic vocals. Sing the provided lyrics exactly once, from first line to last line, in order. Do not repeat the opening lines. Keep the pace energetic and clear so every word fits.`
        : `${directorBrief.audioStyle} soundtrack, ${directorBrief.pacing === 'fast' ? 'upbeat driving tempo' : 'smooth ambient tempo'}, subtle synth and modern instrumentation`;

      const audioArgs: Record<string, any> = {
        action: 'music',
        prompt: audioPrompt,
        duration: Math.min(60, Math.max(15, requestedDuration)),
        async: true,
      };

      if (isVocal) {
        audioArgs.instrumental = false;
        if (directorBrief.lyricsPrompt) {
          audioArgs.lyrics_prompt = directorBrief.lyricsPrompt;
        }
      }

      try {
        const audioDispatch = await livepeerAgent.dispatchCreateMedia(audioArgs);
        if (audioDispatch.status === 'failed') {
          console.warn('[generate:POST] audio dispatch notice:', audioDispatch.error);
        } else if (audioDispatch.url) {
          audioUrl = audioDispatch.url;
        } else if (audioDispatch.jobId) {
          audioJobId = audioDispatch.jobId;
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
      const numScenes = Math.min(4, Math.max(2, Math.ceil(requestedDuration / 15)));
      const totalAssembledDuration = numScenes * 15;

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
          const anchor = await livepeerAgent.generateCharacterConcept(conceptPrompt);
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
        scenePromptsToUse.map((scenePrompt) => {
          const charDna = directorBrief.characterBible ? ` Characters: ${directorBrief.characterBible}.` : '';
          const fullPrompt = `${scenePrompt}.${charDna} Visual aesthetic: ${directorBrief.visualTheme}. Pacing: ${directorBrief.pacing}. Composition: ${directorBrief.aspectRatio}.`;

          return livepeerAgent.dispatchCreateMedia({
            action: 'generate',
            prompt: fullPrompt,
            model_override: multiSceneModel,
            duration: 15,
            async: true,
          });
        })
      );

      const anyFailed = sceneDispatches.some(d => d.status === 'failed' || (!d.jobId && !d.url));
      if (anyFailed) {
        const rawErr = sceneDispatches.find(d => d.error)?.error || 'Failed to dispatch one of the scene takes to Livepeer.';
        return NextResponse.json({ success: false, error: humanizeUpstreamError(rawErr) }, { status: 500 });
      }

      const scenes = sceneDispatches.map((disp, idx) => ({
        sceneNumber: idx + 1,
        durationSeconds: 15,
        title: `Scene ${idx + 1}`,
        prompt: scenePromptsToUse[idx],
        jobId: disp.jobId,
        url: disp.url,
        model: multiSceneModel,
        characterAnchorUrl,
      }));

      const stageDesc = `Directing ${totalAssembledDuration}s multi-scene sequence (${numScenes} scenes on ${multiSceneModel}${characterAnchorUrl ? ' with Character Anchor' : ''})...`;

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
        expectedSla: '~4 min',
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

    // Single-scene path (duration <= 15)
    const singleTakeDuration = modelToUse.includes('seedance')
      ? Math.min(15, Math.max(5, requestedDuration))
      : Math.min(8, Math.max(3, requestedDuration >= 7 ? 8 : requestedDuration >= 4 ? 5 : 3));

    const livepeerPrompt = `${directorBrief.enrichedPrompt}. Visual style: ${directorBrief.visualTheme}. Pacing: ${directorBrief.pacing}. Composition: ${directorBrief.aspectRatio}.`;

    const dispatchArgs: Record<string, any> = {
      action: isImageToVideo ? 'animate' : 'generate',
      prompt: livepeerPrompt,
      model_override: modelToUse,
      duration: singleTakeDuration,
      async: true,
      ...(validatedImageUrl ? { source_url: validatedImageUrl } : {}),
    };

    const videoDispatch = await livepeerAgent.dispatchCreateMedia(dispatchArgs);

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
        const audioPoll = await livepeerAgent.pollJobStatus(audioJobId);
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
          });
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
        durationSeconds: singleTakeDuration,
        directorBrief,
        syntheticPreferences,
        modelName,
        finalAudioUrl,
        wasMuxed,
        agentNotes: `Livepeer Agent returned an immediately completed ${singleTakeDuration}s take via [${modelName}${wasMuxed ? ' + timeline-assembly' : ''}].`,
      });

      const result = {
        mediaVersion,
        enrichedPrompt: directorBrief.enrichedPrompt,
        appliedMemories: syntheticPreferences,
        directorMessage: directorBrief.agentMessage || `Here is your ${singleTakeDuration}-second video take!`,
        summaryTokens: [directorBrief.visualTheme || 'Cinematic', directorBrief.pacing || 'cinematic', `${singleTakeDuration}s`],
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
        singleTakeDuration,
        effectiveDuration: singleTakeDuration,
        expectedSla,
        result,
      });

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
      singleTakeDuration,
      effectiveDuration: singleTakeDuration,
      expectedSla,
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
