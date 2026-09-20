import { NextResponse } from 'next/server';
import { directCreativeBrief } from '@/lib/ai/nue-director';
import { livepeerAgent } from '@/lib/livepeer/agent';
import { supabase } from '@/lib/supabase/client';
import { checkRateLimit, getClientIdentifier } from '@/lib/security/rate-limit';
import { sanitizeText, validateImageSource } from '@/lib/security/sanitize';
import { authenticateRequest } from '@/lib/auth/server';
import { createJob, getJob, updateJob } from '@/lib/jobs/registry';
import { MediaVersion } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 300;

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

    // MULTI-SCENE 30S PIPELINE
    if (job?.isMultiScene) {
      const scene1JobId = job.scene1JobId || job.livepeerJobId || paramLivepeerJobId;
      const scene2JobId = job.scene2JobId || paramScene2JobId;
      let scene1Url = job.scene1Url;
      let scene2Url = job.scene2Url;

      // Validate that scene jobs exist
      if ((!scene1Url && !scene1JobId) || (!scene2Url && !scene2JobId)) {
        updateJob(jobId, { status: 'failed', error: 'Multi-scene job configuration missing scene identifiers.' });
        return NextResponse.json({
          success: true,
          job: { status: 'failed', error: 'Multi-scene job configuration missing scene identifiers.' },
        });
      }

      // Poll Scene 1 if not done
      if (!scene1Url && scene1JobId) {
        const poll1 = await livepeerAgent.pollJobStatus(scene1JobId);
        if (poll1.status === 'failed') {
          updateJob(jobId, { status: 'failed', error: poll1.error || 'Livepeer Scene 1 render failed.' });
          return NextResponse.json({
            success: true,
            job: { status: 'failed', error: poll1.error || 'Livepeer Scene 1 render failed.' },
          });
        }
        if (poll1.status === 'completed' && poll1.url) {
          scene1Url = poll1.url;
          updateJob(jobId, { scene1Url });
        }
      }

      // Poll Scene 2 if not done
      if (!scene2Url && scene2JobId) {
        const poll2 = await livepeerAgent.pollJobStatus(scene2JobId);
        if (poll2.status === 'failed') {
          updateJob(jobId, { status: 'failed', error: poll2.error || 'Livepeer Scene 2 render failed.' });
          return NextResponse.json({
            success: true,
            job: { status: 'failed', error: poll2.error || 'Livepeer Scene 2 render failed.' },
          });
        }
        if (poll2.status === 'completed' && poll2.url) {
          scene2Url = poll2.url;
          updateJob(jobId, { scene2Url });
        }
      }

      // If either scene is still rendering, return combined progress
      if (!scene1Url || !scene2Url) {
        const elapsedSec = Math.max(1, Math.round((Date.now() - new Date(job.createdAt).getTime()) / 1000));
        const modelName = job.modelToUse || 'seedance-25-t2v';
        const progress = Math.min(88, 20 + Math.round((elapsedSec / 240) * 65));
        const stageDescription = scene1Url
          ? `Scene 1 take ready (15s), Scene 2 finishing (${elapsedSec}s / ~4 min)...`
          : scene2Url
          ? `Scene 2 take ready (15s), Scene 1 finishing (${elapsedSec}s / ~4 min)...`
          : `Rendering 30s takes (Scene 1 & Scene 2 in parallel on ${modelName}, ${elapsedSec}s / ~4 min)...`;

        updateJob(jobId, { progress, stageDescription });
        return NextResponse.json({
          success: true,
          job: {
            id: jobId,
            status: 'rendering',
            progress,
            stageDescription,
          },
        });
      }

      // Both scenes finished! Poll audio if pending
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

      // Assemble 30s timeline with audio
      let finalMediaUrl = scene1Url;
      let wasMuxed = false;
      try {
        const assembled = await livepeerAgent.assembleTimeline({
          clips: [
            { src: scene1Url, title: 'Scene 1: Opening' },
            { src: scene2Url, title: 'Scene 2: Finale' },
          ],
          audioUrl: finalAudioUrl,
          transition: 'cut',
        });
        if (assembled) {
          finalMediaUrl = assembled;
          wasMuxed = true;
        }
      } catch (e) {
        console.warn('[generate:GET] assembleTimeline 30s notice:', e);
      }

      const versionNumber = job.versionNumber || 1;
      const actualDuration = wasMuxed ? 30 : 15;
      const scenes = [
        {
          sceneNumber: 1,
          durationSeconds: 15,
          title: 'Scene 1: Opening Take',
          prompt: job.scene1Prompt || directorBrief?.scenePrompts?.[0] || 'Scene 1',
          mediaUrl: scene1Url,
          model: modelName,
        },
        {
          sceneNumber: 2,
          durationSeconds: 15,
          title: 'Scene 2: Narrative Finale',
          prompt: job.scene2Prompt || directorBrief?.scenePrompts?.[1] || 'Scene 2',
          mediaUrl: scene2Url,
          model: modelName,
        },
      ];

      let truthfulDirectorMessage = directorBrief?.agentMessage || 'Your video has been directed and composed successfully.';
      if (wasMuxed) {
        truthfulDirectorMessage = truthfulDirectorMessage
          .replace(/\b(?:8|15)[- ]seconds?\b/gi, '30-second')
          .replace(/\b(?:8|15)s\b/gi, '30s');
      } else {
        truthfulDirectorMessage = truthfulDirectorMessage
          .replace(/\b30[- ]seconds?\b/gi, '15-second')
          .replace(/\b30s\b/gi, '15s');
      }

      const mediaVersion: MediaVersion = {
        versionNumber,
        createdAt: new Date().toISOString(),
        brief: directorBrief?.enrichedPrompt || `${actualDuration}s AI Video Take`,
        enrichedBrief: directorBrief?.enrichedPrompt || `${actualDuration}s AI Video Take`,
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
          style: directorBrief?.audioStyle || 'Melodic',
          tempo: directorBrief?.audioEnabled ? 'ambient' : 'none',
          audioUrl: wasMuxed ? undefined : finalAudioUrl,
          isMuxed: wasMuxed,
        },
        visualTheme: directorBrief?.visualTheme || 'Cinematic',
        agentNotes: wasMuxed
          ? `Livepeer Agent sequenced 2 scenes into a continuous 30s timeline via [${modelName} + assemble].`
          : `Livepeer Agent composed Scene 1 take (15s) on ${modelName}. Multi-scene assembly fallback applied.`,
        generationDurationSeconds: actualDuration,
        livepeerCapability: wasMuxed ? `${modelName} + assemble` : modelName,
        scenes,
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
        stageDescription: '30-second video assembly complete',
        result,
      });

      return NextResponse.json({
        success: true,
        job: {
          id: jobId,
          status: 'completed',
          progress: 100,
          stageDescription: '30-second video assembly complete',
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
      updateJob(jobId, { status: 'failed', error: pollResult.error || 'Livepeer render failed.' });
      return NextResponse.json({
        success: true,
        job: { status: 'failed', error: pollResult.error || 'Livepeer render failed.' },
      });
    }

    if (pollResult.status === 'running') {
      const elapsedSec = job ? Math.max(1, Math.round((Date.now() - new Date(job.createdAt).getTime()) / 1000)) : 10;
      const modelName = job?.modelToUse || 'seedance-25-t2v';
      const expectedSla = modelName.includes('seedance') ? '~4 min' : '~40s';
      const maxEstimatedSec = modelName.includes('seedance') ? 240 : 45;
      const progress = Math.min(85, 25 + Math.round((elapsedSec / maxEstimatedSec) * 60));
      const stageDescription = `Rendering on ${modelName} (${elapsedSec}s / ${expectedSla})...`;

      updateJob(jobId, { progress, stageDescription });
      return NextResponse.json({
        success: true,
        job: {
          id: jobId,
          status: 'rendering',
          progress,
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
      }

      const versionNumber = job?.versionNumber || 1;
      const actualDuration = job?.singleTakeDuration || 15;
      const requestedDuration = directorBrief?.duration || actualDuration;
      let truthfulDirectorMessage = directorBrief?.agentMessage || 'Your video take has been composed successfully.';

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

      const mediaVersion: MediaVersion = {
        versionNumber,
        createdAt: new Date().toISOString(),
        brief: directorBrief?.enrichedPrompt || 'AI Video Take',
        enrichedBrief: directorBrief?.enrichedPrompt || 'AI Video Take',
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
          style: directorBrief?.audioStyle || 'Ambient',
          tempo: directorBrief?.audioEnabled ? 'ambient' : 'none',
          audioUrl: wasMuxed ? undefined : finalAudioUrl,
          isMuxed: wasMuxed,
        },
        visualTheme: directorBrief?.visualTheme || 'Cinematic',
        agentNotes: `Livepeer Agent composed version ${versionNumber} via [${modelName}${wasMuxed ? ' + assemble' : ''}].`,
        generationDurationSeconds: actualDuration,
        livepeerCapability: modelName + (wasMuxed ? ' + assemble' : ''),
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
    const { brief, versionNumber = 1, projectTitle = 'Media Project', feedbackContext, userId, email, imageUrl } = body;

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

    // Step 5: Verify credit balance in Supabase before dispatching compute
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
            error: 'Insufficient credit balance ($0.05 required for media render). Please top up your balance to continue.',
            credit_balance: balance,
          },
          { status: 402 }
        );
      }
    }

    // Step 6: Direct creative brief via Groq + MemWal (~5s synchronous)
    const directorBrief = await directCreativeBrief(sanitizedBrief, {
      email: effectiveUserId,
      feedbackContext: sanitizedFeedback,
      projectTitle: sanitizedTitle,
      imageUrl: validatedImageUrl,
    });

    // Handle conversational messages immediately without dispatching media
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

    // Build synthetic preferences
    const syntheticPreferences = [];
    if (directorBrief.visualTheme && directorBrief.visualTheme !== 'Modern Product Showcase') {
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

    // Step 7: Dispatch media generation to Livepeer (<3s synchronous)
    const isImageToVideo = Boolean(validatedImageUrl);
    const modelToUse = isImageToVideo
      ? (directorBrief.model?.includes('pixverse') ? 'pixverse-i2v' : 'seedance-25-i2v')
      : directorBrief.model || 'seedance-25-t2v';

    const requestedDuration = directorBrief.duration || 15;
    const isMultiScene = !isImageToVideo && requestedDuration > 15;

    // Dispatch background soundtrack in parallel if requested (with singing vocals / lyrics support)
    let audioJobId: string | undefined;
    let audioUrl: string | undefined;
    if (directorBrief.audioEnabled && directorBrief.audioStyle) {
      const isVocal = Boolean(directorBrief.hasVocals || directorBrief.lyricsPrompt);
      const audioPrompt = isVocal
        ? `${directorBrief.audioStyle} with expressive melodious singing voice, clear child-friendly song cadence`
        : `${directorBrief.audioStyle} soundtrack, ${directorBrief.pacing === 'fast' ? 'upbeat driving tempo' : 'smooth ambient tempo'}, subtle synth and modern instrumentation`;

      const audioArgs: Record<string, any> = {
        action: 'music',
        prompt: audioPrompt,
        async: true,
      };

      if (isVocal) {
        audioArgs.instrumental = false;
        if (directorBrief.lyricsPrompt) {
          audioArgs.lyrics_prompt = directorBrief.lyricsPrompt;
        }
      }

      const audioDispatch = await livepeerAgent.dispatchCreateMedia(audioArgs);
      if (audioDispatch.url) audioUrl = audioDispatch.url;
      else if (audioDispatch.jobId) audioJobId = audioDispatch.jobId;
    }

    const jobId = `job-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    createJob({
      id: jobId,
      userId: effectiveUserId,
      projectTitle: sanitizedTitle,
      versionNumber: Number(versionNumber) || 1,
    });

    if (isMultiScene) {
      let scene1Prompt = directorBrief.scenePrompts?.[0];
      let scene2Prompt = directorBrief.scenePrompts?.[1];
      if (!scene1Prompt || !scene2Prompt) {
        scene1Prompt = `${directorBrief.enrichedPrompt} (Scene 1 Opening: character entrance and starting choreography)`;
        scene2Prompt = `${directorBrief.enrichedPrompt} (Scene 2 Finale: celebratory high-energy dancing and group sync)`;
      }

      const [scene1Dispatch, scene2Dispatch] = await Promise.all([
        livepeerAgent.dispatchCreateMedia({
          action: 'generate',
          prompt: `${scene1Prompt}. Visual style: ${directorBrief.visualTheme}. Pacing: ${directorBrief.pacing}. Composition: ${directorBrief.aspectRatio}.`,
          model_override: modelToUse,
          duration: 15,
        }),
        livepeerAgent.dispatchCreateMedia({
          action: 'generate',
          prompt: `${scene2Prompt}. Visual style: ${directorBrief.visualTheme}. Pacing: ${directorBrief.pacing}. Composition: ${directorBrief.aspectRatio}.`,
          model_override: modelToUse,
          duration: 15,
        }),
      ]);

      if (
        scene1Dispatch.status === 'failed' ||
        scene2Dispatch.status === 'failed' ||
        (!scene1Dispatch.jobId && !scene1Dispatch.url) ||
        (!scene2Dispatch.jobId && !scene2Dispatch.url)
      ) {
        return NextResponse.json({
          success: false,
          error: scene1Dispatch.error || scene2Dispatch.error || 'Failed to dispatch one of the multi-scene takes to Livepeer.',
        }, { status: 500 });
      }

      updateJob(jobId, {
        status: 'rendering',
        progress: 20,
        stageDescription: `Directing 30s multi-scene sequence on ${modelToUse} (Scene 1 & Scene 2 in parallel)...`,
        isMultiScene: true,
        scene1JobId: scene1Dispatch.jobId,
        scene2JobId: scene2Dispatch.jobId,
        scene1Url: scene1Dispatch.url,
        scene2Url: scene2Dispatch.url,
        scene1Prompt,
        scene2Prompt,
        livepeerJobId: scene1Dispatch.jobId,
        audioJobId,
        audioUrl,
        directorBrief,
        syntheticPreferences,
        modelToUse,
        singleTakeDuration: 30,
        effectiveDuration: 30,
      });

      return NextResponse.json({
        success: true,
        jobId,
        status: 'rendering',
        livepeerJobId: scene1Dispatch.jobId,
        scene2JobId: scene2Dispatch.jobId,
        audioJobId,
        isMultiScene: true,
        model: modelToUse,
        stageDescription: `Directing 30s multi-scene sequence on ${modelToUse} (Scene 1 & Scene 2 in parallel)...`,
        progress: 20,
      });
    }

    // Single-scene path (duration <= 15)
    const singleTakeDuration = modelToUse.includes('seedance')
      ? Math.min(15, Math.max(5, requestedDuration))
      : 8;

    const livepeerPrompt = `${directorBrief.enrichedPrompt}. Visual style: ${directorBrief.visualTheme}. Pacing: ${directorBrief.pacing}. Composition: ${directorBrief.aspectRatio}.`;

    const dispatchArgs: Record<string, any> = {
      action: isImageToVideo ? 'animate' : 'generate',
      prompt: livepeerPrompt,
      model_override: modelToUse,
      duration: singleTakeDuration,
      ...(validatedImageUrl ? { source_url: validatedImageUrl } : {}),
    };

    const videoDispatch = await livepeerAgent.dispatchCreateMedia(dispatchArgs);

    if (videoDispatch.status === 'failed') {
      return NextResponse.json({
        success: false,
        error: videoDispatch.error || 'Failed to dispatch media generation to Livepeer.',
      }, { status: 500 });
    }

    updateJob(jobId, {
      status: 'rendering',
      progress: 25,
      stageDescription: `Rendering on ${modelToUse} (~4 min)...`,
      livepeerJobId: videoDispatch.jobId,
      audioJobId,
      audioUrl,
      directorBrief,
      syntheticPreferences,
      modelToUse,
      singleTakeDuration,
      effectiveDuration: singleTakeDuration,
    });

    return NextResponse.json({
      success: true,
      jobId,
      status: 'rendering',
      livepeerJobId: videoDispatch.jobId,
      audioJobId,
      model: modelToUse,
      stageDescription: `Rendering on ${modelToUse} (~4 min)...`,
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
    return NextResponse.json({ success: false, error: err?.message || String(error) }, { status: 500 });
  }
}
