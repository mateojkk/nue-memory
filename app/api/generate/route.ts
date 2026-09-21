import { NextResponse } from 'next/server';
import { directCreativeBrief } from '@/lib/ai/nue-director';
import { livepeerAgent } from '@/lib/livepeer/agent';
import { supabase } from '@/lib/supabase/client';
import { checkRateLimit, getClientIdentifier } from '@/lib/security/rate-limit';
import { sanitizeText, validateImageSource } from '@/lib/security/sanitize';
import { authenticateRequest } from '@/lib/auth/server';
import { createJob, getJob, updateJob } from '@/lib/jobs/registry';
import { MediaVersion } from '@/lib/types';
import { memWalService } from '@/lib/walrus-memwal/client';

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
            updateJob(jobId, { status: 'failed', error: poll.error || `Scene ${scene.sceneNumber} render failed.` });
            return NextResponse.json({
              success: true,
              job: { status: 'failed', error: poll.error || `Scene ${scene.sceneNumber} render failed.` },
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
      try {
        const assembled = await livepeerAgent.assembleTimeline({
          clips,
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

      const versionNumber = job.versionNumber || 1;
      const totalTimelineSec = scenesList.reduce((acc, s) => acc + (s.durationSeconds || 15), 0);
      const actualDuration = wasMuxed ? totalTimelineSec : (scenesList[0]?.durationSeconds || 15);

      let truthfulDirectorMessage = directorBrief?.agentMessage || 'Your video has been directed and composed successfully.';
      if (wasMuxed) {
        truthfulDirectorMessage = truthfulDirectorMessage
          .replace(/\b(?:8|15|30|45)[- ]seconds?\b/gi, `${actualDuration}-second`)
          .replace(/\b(?:8|15|30|45)s\b/gi, `${actualDuration}s`);
      } else {
        truthfulDirectorMessage = truthfulDirectorMessage
          .replace(/\b(?:30|45|60)[- ]seconds?\b/gi, '15-second')
          .replace(/\b(?:30|45|60)s\b/gi, '15s');
      }

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
          style: directorBrief?.audioStyle || 'Melodic',
          tempo: directorBrief?.audioEnabled ? 'ambient' : 'none',
          audioUrl: wasMuxed ? undefined : finalAudioUrl,
          isMuxed: wasMuxed,
        },
        visualTheme: directorBrief?.visualTheme || 'Cinematic',
        agentNotes: wasMuxed
          ? `Livepeer Agent sequenced ${scenesList.length} scenes into a continuous ${actualDuration}s timeline via [${modelName} + assemble].`
          : `Livepeer Agent composed Scene 1 take (15s) on ${modelName}. Multi-scene assembly fallback applied.`,
        generationDurationSeconds: actualDuration,
        livepeerCapability: wasMuxed ? `${modelName} + assemble` : modelName,
        scenes: scenesList,
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
      updateJob(jobId, { status: 'failed', error: pollResult.error || 'Livepeer render failed.' });
      return NextResponse.json({
        success: true,
        job: { status: 'failed', error: pollResult.error || 'Livepeer render failed.' },
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
    const { brief, versionNumber = 1, projectTitle = 'Media Project', feedbackContext, chatHistory, userId, email, imageUrl } = body;

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

    // Step 6: Direct creative brief via Groq + MemWal (~5s synchronous) with full chat history
    const directorBrief = await directCreativeBrief(sanitizedBrief, {
      email: effectiveUserId,
      feedbackContext: sanitizedFeedback,
      projectTitle: sanitizedTitle,
      imageUrl: validatedImageUrl,
      chatHistory: Array.isArray(chatHistory) ? chatHistory : undefined,
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

    // Persist newly discovered creative preferences to decentralized Walrus MemWal
    if (effectiveUserId) {
      try {
        if (directorBrief.visualTheme && directorBrief.visualTheme !== 'Creative Direction') {
          await memWalService.rememberPreference({
            id: `pref_visual_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            userId: effectiveUserId,
            type: 'media_preference',
            category: 'visual_style',
            preference: directorBrief.visualTheme,
            strength: 'high',
            scope: 'media',
            source: 'user_feedback',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: true,
          });
        }
        if (directorBrief.audioEnabled && directorBrief.audioStyle) {
          await memWalService.rememberPreference({
            id: `pref_audio_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            userId: effectiveUserId,
            type: 'media_preference',
            category: 'audio',
            preference: directorBrief.audioStyle,
            strength: 'high',
            scope: 'media',
            source: 'user_feedback',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: true,
          });
        }
      } catch (memErr) {
        console.warn('[Generate] Walrus MemWal decentralized persistence notice:', memErr);
      }
    }

    // Build synthetic preferences
    const syntheticPreferences = [];
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
        ? `${directorBrief.audioStyle}, expressive melodic vocals singing the lyrics continuously from start to finish across the full ${requestedDuration}s song, clear musical cadence`
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
      const numScenes = Math.min(4, Math.max(2, Math.ceil(requestedDuration / 15)));
      const totalAssembledDuration = numScenes * 15;

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
        scenePromptsToUse.map((scenePrompt) =>
          livepeerAgent.dispatchCreateMedia({
            action: 'generate',
            prompt: `${scenePrompt}. Visual aesthetic: ${directorBrief.visualTheme}. Pacing: ${directorBrief.pacing}. Composition: ${directorBrief.aspectRatio}.`,
            model_override: modelToUse,
            duration: 15,
            async: true,
          })
        )
      );

      const anyFailed = sceneDispatches.some(d => d.status === 'failed' || (!d.jobId && !d.url));
      if (anyFailed) {
        const err = sceneDispatches.find(d => d.error)?.error || 'Failed to dispatch one of the scene takes to Livepeer.';
        return NextResponse.json({ success: false, error: err }, { status: 500 });
      }

      const scenes = sceneDispatches.map((disp, idx) => ({
        sceneNumber: idx + 1,
        durationSeconds: 15,
        title: `Scene ${idx + 1}`,
        prompt: scenePromptsToUse[idx],
        jobId: disp.jobId,
        url: disp.url,
        model: modelToUse,
      }));

      updateJob(jobId, {
        status: 'rendering',
        progress: 20,
        stageDescription: `Directing ${totalAssembledDuration}s multi-scene sequence (${numScenes} scenes on ${modelToUse})...`,
        isMultiScene: true,
        scenes,
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
        modelToUse,
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
        model: modelToUse,
        expectedSla: '~4 min',
        stageDescription: `Directing ${totalAssembledDuration}s multi-scene sequence (${numScenes} scenes on ${modelToUse})...`,
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
        error: videoDispatch.error || 'Failed to dispatch media generation to Livepeer.',
      }, { status: 500 });
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
    return NextResponse.json({ success: false, error: err?.message || String(error) }, { status: 500 });
  }
}
