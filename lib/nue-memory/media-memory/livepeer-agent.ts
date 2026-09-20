import { MediaPreference, MediaVersion, GenerateMediaRequest } from './types';

export class LivepeerMediaAgent {
  private endpoint: string;
  private bearer?: string;
  private isInitialized = false;

  constructor() {
    this.endpoint =
      process.env.LIVEPEER_AGENT_MCP_URL || 'https://agent.livepeer.org/api/mcp/creative';
    this.bearer = process.env.LIVEPEER_API_KEY || process.env.LIVEPEER_AGENT_KEY;
  }

  private async initializeMcp(): Promise<void> {
    if (this.isInitialized) return;
    try {
      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          ...(this.bearer ? { Authorization: `Bearer ${this.bearer}` } : {}),
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2025-03-26',
            capabilities: {},
            clientInfo: { name: 'nue-media-memory-agent', version: '1.0.0' },
          },
        }),
      });

      if (res.ok) {
        this.isInitialized = true;
      }
    } catch (e) {
      console.warn('[LivepeerAgent] MCP initialize notice:', e);
    }
  }

  /**
   * Generates a custom soundtrack via Livepeer MCP music capability
   */
  private async generateAudioTrack(audioPrompt: string): Promise<string | null> {
    try {
      console.log(`[LivepeerAgent] Initiating AI soundtrack generation: "${audioPrompt}"...`);
      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          ...(this.bearer ? { Authorization: `Bearer ${this.bearer}` } : {}),
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: 'create_media',
            arguments: {
              action: 'music',
              prompt: audioPrompt,
            },
          },
        }),
      });

      if (!res.ok) return null;
      const data = await res.json();
      const content = data.result?.structuredContent;
      if (content?.url) {
        return content.url;
      }
      if (content?.job_id) {
        const jobId = content.job_id;
        // Poll for audio completion (up to 25 attempts * 4s = 100s)
        for (let i = 0; i < 25; i++) {
          await new Promise((resolve) => setTimeout(resolve, 4000));
          const pollRes = await fetch(this.endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json, text/event-stream',
              ...(this.bearer ? { Authorization: `Bearer ${this.bearer}` } : {}),
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: Date.now(),
              method: 'tools/call',
              params: {
                name: 'get_create_media',
                arguments: { job_id: jobId },
              },
            }),
          });
          if (pollRes.ok) {
            const pollData = await pollRes.json();
            const pollContent = pollData.result?.structuredContent;
            if (pollContent?.status === 'done' && pollContent.url) {
              console.log(`[LivepeerAgent] AI soundtrack completed! URL: ${pollContent.url}`);
              return pollContent.url;
            }
            if (pollContent?.status === 'failed') {
              break;
            }
          }
        }
      }
    } catch (err) {
      console.warn('[LivepeerAgent] Soundtrack generation notice:', err);
    }
    return null;
  }

  /**
   * Assembles multiple video clips and optional soundtrack into a unified timeline using Livepeer assemble MCP tool
   */
  public async assembleTimeline(options: {
    clips: Array<{ src: string; title?: string }>;
    audioUrl?: string | null;
    transition?: 'cut' | 'crossfade' | 'fade';
  }): Promise<string | null> {
    try {
      const args: Record<string, any> = {
        clips: options.clips,
        transition: options.transition || 'cut',
        stitch: true,
      };
      if (options.audioUrl) {
        args.music = options.audioUrl;
      }

      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          ...(this.bearer ? { Authorization: `Bearer ${this.bearer}` } : {}),
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: 'assemble',
            arguments: args,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.result?.structuredContent;
        if (content?.url && (!content?.warnings || content.warnings.length === 0)) {
          return content.url;
        }
      }
    } catch (err) {
      console.warn('[LivepeerAgent] assembleTimeline notice:', err);
    }
    return null;
  }

  /**
   * Muxes video clip with audio track using Livepeer assemble tool (backward compat)
   */
  private async muxVideoAndAudio(videoUrl: string, audioUrl: string): Promise<string | null> {
    return this.assembleTimeline({
      clips: [{ src: videoUrl }],
      audioUrl,
      transition: 'cut',
    });
  }

  /**
   * Uploads an image (base64 data URL or external URL) to Livepeer storage via MCP upload_image tool
   */
  public async uploadImage(imageSource: string): Promise<string | null> {
    try {
      await this.initializeMcp();
      let dataPayload: string | undefined;
      let sourceUrlPayload: string | undefined;
      let mimeType: any = 'image/png';

      if (imageSource.startsWith('data:')) {
        const matches = imageSource.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          const rawMime = matches[1].toLowerCase();
          if (['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'].includes(rawMime)) {
            mimeType = rawMime;
          }
          dataPayload = matches[2];
        } else {
          dataPayload = imageSource;
        }
      } else if (imageSource.startsWith('http://') || imageSource.startsWith('https://')) {
        sourceUrlPayload = imageSource;
      } else {
        dataPayload = imageSource;
      }

      const args: Record<string, any> = { mime_type: mimeType };
      if (sourceUrlPayload) {
        args.source_url = sourceUrlPayload;
      } else if (dataPayload) {
        args.data = dataPayload;
      }

      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          ...(this.bearer ? { Authorization: `Bearer ${this.bearer}` } : {}),
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: 'upload_image',
            arguments: args,
          },
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const content = json.result?.structuredContent;
        if (content?.url) {
          console.log(`[LivepeerAgent] Image uploaded successfully! URL: ${content.url}`);
          return content.url;
        }
      }
    } catch (err) {
      console.warn('[LivepeerAgent] uploadImage notice:', err);
    }
    return null;
  }

  /**
   * Generates a new media version based on the enriched brief and applied preferences
   */
  public async generateMedia(request: GenerateMediaRequest): Promise<MediaVersion> {
    const { brief, enrichedBrief, appliedPreferences, versionNumber, projectTitle, feedbackContext, creativeDirectives, imageUrl, scenePrompts, onProgress } = request;

    await this.initializeMcp();

    // Determine creative directives from applied preferences
    let pacing: 'fast' | 'moderate' | 'cinematic' = 'moderate';
    let captionSize: 'small' | 'medium' | 'large' = 'medium';
    let audioStyle = 'Ambient modern electronic';
    let audioTempo: 'energetic' | 'ambient' | 'none' = 'ambient';
    let aspectRatio: '16:9' | '9:16' | '1:1' = '16:9';
    let visualTheme = 'Modern Product Showcase';

    // Apply remembered preferences
    for (const pref of appliedPreferences) {
      if (pref.category === 'pacing') {
        pacing = pref.preference.toLowerCase().includes('fast') ? 'fast' : 'cinematic';
      }
      if (pref.category === 'captions' || pref.category === 'typography') {
        captionSize = pref.preference.toLowerCase().includes('large') ? 'large' : 'medium';
      }
      if (pref.category === 'music' || pref.category === 'audio') {
        audioStyle = pref.preference;
        if (pref.preference.toLowerCase().includes('avoid') || pref.preference.toLowerCase().includes('remove')) {
          audioTempo = 'none';
        } else if (pref.preference.toLowerCase().includes('upbeat')) {
          audioTempo = 'energetic';
        }
      }
      if (pref.category === 'aspect_ratio' || pref.category === 'layout') {
        aspectRatio = pref.preference.includes('9:16') ? '9:16' : '16:9';
      }
    }

    // Direct feedback in current turn can also adjust version parameters immediately
    if (feedbackContext) {
      const lowerFeedback = feedbackContext.toLowerCase();
      if (lowerFeedback.includes('slow') || lowerFeedback.includes('speed up') || lowerFeedback.includes('energetic') || lowerFeedback.includes('fast')) {
        pacing = 'fast';
      }
      if (lowerFeedback.includes('larger') || lowerFeedback.includes('bigger') || lowerFeedback.includes('captions')) {
        captionSize = 'large';
      }
      // Audio intent: check affirmative audio requests first
      if (
        lowerFeedback.includes('with audio') ||
        lowerFeedback.includes('some audio') ||
        lowerFeedback.includes('ambient audio') ||
        lowerFeedback.includes('with music') ||
        lowerFeedback.includes('ambient sound') ||
        lowerFeedback.includes('add music') ||
        lowerFeedback.includes('soundtrack')
      ) {
        audioTempo = 'ambient';
        audioStyle = 'Deep ambient atmospheric cinematic soundtrack';
      } else if (
        lowerFeedback.includes('no audio') ||
        lowerFeedback.includes('remove audio') ||
        lowerFeedback.includes('mute audio') ||
        lowerFeedback.includes('no music') ||
        lowerFeedback.includes('remove music') ||
        lowerFeedback.includes('mute music')
      ) {
        audioTempo = 'none';
        audioStyle = 'Muted';
      }

      // Visual styling in feedback
      if (
        lowerFeedback.includes('monochrome') ||
        lowerFeedback.includes('black and white') ||
        lowerFeedback.includes('b&w') ||
        lowerFeedback.includes('grayscale') ||
        lowerFeedback.includes('greyscale')
      ) {
        visualTheme = 'Cinematic Monochrome, High Contrast Black and White Film';
      } else if (
        lowerFeedback.includes('cyberpunk') ||
        lowerFeedback.includes('neon')
      ) {
        visualTheme = 'Cyberpunk Neon Nocturne';
      }
    }

    // Determine visual subject theme if not overridden by feedback
    if (!feedbackContext || (!feedbackContext.toLowerCase().includes('monochrome') && !feedbackContext.toLowerCase().includes('cyberpunk'))) {
      if (projectTitle.toLowerCase().includes('clothing') || brief.toLowerCase().includes('clothing') || brief.toLowerCase().includes('fashion')) {
        visualTheme = 'Contemporary Urban Apparel';
      } else if (projectTitle.toLowerCase().includes('app') || brief.toLowerCase().includes('app') || brief.toLowerCase().includes('promo')) {
        visualTheme = 'Next-Gen Mobile Application';
      }
    }

    // Duration parsing: check creativeDirectives, remembered preferences, and feedbackContext
    let targetDuration = creativeDirectives?.duration || 5;
    for (const pref of appliedPreferences) {
      if (pref.category === 'duration' || pref.category === 'length') {
        const match = pref.preference.match(/(\d+)\s*(?:seconds?|secs?|s)?/i);
        if (match) {
          targetDuration = Math.max(3, parseInt(match[1], 10));
        }
      }
    }
    if (feedbackContext) {
      const match = feedbackContext.match(/(\d+)\s*(?:seconds?|secs?|s)?/i);
      if (match) {
        targetDuration = Math.max(3, parseInt(match[1], 10));
      }
    }

    // Check if user explicitly requested a specific model (e.g. "use seedance", "seedance", "pixverse", "ltx")
    const preferredModel = creativeDirectives?.model?.toLowerCase();
    const explicitSeedance =
      preferredModel?.includes('seedance') ||
      (feedbackContext && feedbackContext.toLowerCase().includes('seedance')) ||
      brief.toLowerCase().includes('seedance');
    const explicitPixverse =
      preferredModel?.includes('pixverse') ||
      (feedbackContext && feedbackContext.toLowerCase().includes('pixverse')) ||
      brief.toLowerCase().includes('pixverse');
    const explicitLtx =
      preferredModel?.includes('ltx') ||
      (feedbackContext && feedbackContext.toLowerCase().includes('ltx')) ||
      brief.toLowerCase().includes('ltx');

    // Handle Image-to-Video if imageUrl is provided
    let hostedImageUrl: string | null = null;
    if (imageUrl) {
      console.log('[LivepeerAgent] Uploading provided image for image-to-video workflow...');
      hostedImageUrl = await this.uploadImage(imageUrl);
      if (hostedImageUrl) {
        console.log(`[LivepeerAgent] Uploaded image hosted at: ${hostedImageUrl}`);
      }
    }

    const isImageToVideo = Boolean(hostedImageUrl);

    // Determine model dispatch strategy:
    // 1. If image provided: Dispatch seedance-25-i2v (or pixverse-i2v if explicit)
    // 2. If explicitly requested pixverse: Dispatch pixverse-t2v
    // 3. If explicitly requested ltx: Dispatch ltx-25-t2v-pro
    // 4. Default: seedance-25-t2v for superior visual quality and up to 15s takes
    const modelToUse = isImageToVideo
      ? (explicitPixverse ? 'pixverse-i2v' : 'seedance-25-i2v')
      : explicitPixverse
      ? 'pixverse-t2v'
      : explicitLtx
      ? 'ltx-25-t2v-pro'
      : 'seedance-25-t2v';

    const maxSingleTake = modelToUse === 'seedance-25-t2v' ? 15 : modelToUse === 'ltx-25-t2v-pro' ? 10 : 8;
    const isLongForm = !isImageToVideo && targetDuration > maxSingleTake;
    const clipCount = isLongForm
      ? (scenePrompts?.length || Math.min(8, Math.max(2, Math.round(targetDuration / maxSingleTake))))
      : 1;

    // Livepeer create_media schema strictly enforces duration <= 15.
    // For seedance: takes up to 15s (clamped between 5 and 15s).
    // For ltx: takes up to 10s. For pixverse: takes up to 8s.
    const singleTakeDuration = modelToUse === 'seedance-25-t2v'
      ? (isLongForm ? 15 : Math.min(15, Math.max(5, targetDuration)))
      : modelToUse === 'ltx-25-t2v-pro'
      ? Math.min(10, Math.max(3, targetDuration))
      : Math.min(8, Math.max(3, targetDuration >= 7 ? 8 : targetDuration >= 4 ? 5 : 3));

    // Expected total sequence duration across all assembled scenes
    const effectiveDuration = isLongForm ? clipCount * singleTakeDuration : singleTakeDuration;

    // Build Livepeer prompt that combines original brief, feedback directives, and styling
    const basePrompt = feedbackContext
      ? `${brief}. Revision directive: ${feedbackContext}`
      : brief;
    const livepeerPrompt = `${basePrompt}. Visual style: ${visualTheme}. Pacing: ${pacing}. Composition: ${aspectRatio}.`;
    const shouldGenerateSound = audioTempo !== 'none';
    const audioPrompt = `${audioStyle} soundtrack, ${audioTempo === 'energetic' ? 'upbeat driving tempo' : 'smooth ambient tempo'}, subtle synth and modern instrumentation matching ${visualTheme}`;
    const audioPromise = shouldGenerateSound ? this.generateAudioTrack(audioPrompt) : Promise.resolve(null);

    // Attempt real live render call via Livepeer Agent MCP create_media tool
    let realMediaUrl: string | null = null;
    let livepeerCapability = modelToUse;
    let generationDuration = effectiveDuration;

    const actionToUse = isImageToVideo ? 'animate' : 'generate';
    const mcpArguments: Record<string, any> = {
      action: actionToUse,
      prompt: livepeerPrompt,
      model_override: modelToUse,
    };
    if (isImageToVideo && hostedImageUrl) {
      mcpArguments.source_url = hostedImageUrl;
    } else {
      // Pass singleTakeDuration so it strictly adheres to the MCP schema (duration <= 15)
      mcpArguments.duration = singleTakeDuration;
    }

    try {
      const mcpCallRes = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          ...(this.bearer ? { Authorization: `Bearer ${this.bearer}` } : {}),
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: 'create_media',
            arguments: mcpArguments,
          },
        }),
      });

      if (mcpCallRes.ok) {
        const mcpData = await mcpCallRes.json();
        const content = mcpData.result?.structuredContent;
        const jobId = content?.job_id;
        const isAsync = Boolean(jobId) && (!content?.url || content?.status === 'pending' || content?.status === 'running');

        // If a completed URL is returned directly (no async polling needed)
        if (content?.url && !isAsync) {
          realMediaUrl = content.url;
          if (content.capability) livepeerCapability = content.capability;
          generationDuration = effectiveDuration;
          console.log(`[LivepeerAgent] Synchronous result from ${modelToUse}: ${realMediaUrl}`);
        } else if (jobId) {
          // Asynchronous job - poll until complete or max poll threshold reached.
          // Livepeer official SLA: seedance-25-t2v p50 is 230s (~3.8m), p95 can be 400s+.
          // Allow up to 80 attempts * 5s = 400s for seedance, 30 * 5s = 150s for others.
          const maxAttempts = modelToUse.includes('seedance') ? 80 : 30;
          const expectedSla = modelToUse.includes('seedance') ? '~4 min' : '~40s';
          console.log(`[LivepeerAgent] Async job ${jobId} initiated for ${modelToUse} (${effectiveDuration}s). Polling up to ${maxAttempts * 5}s (SLA: ${expectedSla})...`);
          for (let attempt = 0; attempt < maxAttempts; attempt++) {
            onProgress?.(
              Math.min(78, 25 + Math.round((attempt / maxAttempts) * 53)),
              `Rendering on ${modelToUse} (${(attempt + 1) * 5}s / ${expectedSla})...`
            );
            await new Promise((resolve) => setTimeout(resolve, 5000));
            try {
              const pollRes = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Accept: 'application/json, text/event-stream',
                  ...(this.bearer ? { Authorization: `Bearer ${this.bearer}` } : {}),
                },
                body: JSON.stringify({
                  jsonrpc: '2.0',
                  id: Date.now(),
                  method: 'tools/call',
                  params: {
                    name: 'get_create_media',
                    arguments: { job_id: jobId },
                  },
                }),
              });
              if (pollRes.ok) {
                const pollData = await pollRes.json();
                const pollContent = pollData.result?.structuredContent;
                if (pollContent?.url && pollContent?.status !== 'pending' && pollContent?.status !== 'running') {
                  realMediaUrl = pollContent.url;
                  livepeerCapability = pollContent.capability || modelToUse;
                  generationDuration = effectiveDuration;
                  console.log(`[LivepeerAgent] Job ${jobId} finished successfully! URL: ${realMediaUrl}`);
                  break;
                }
                if (pollContent?.status === 'failed' || pollContent?.error) {
                  console.warn(`[LivepeerAgent] Job ${jobId} failed:`, pollContent.error);
                  realMediaUrl = null;
                  break;
                }
              }
            } catch (pollErr) {
              console.warn(`[LivepeerAgent] Polling attempt ${attempt + 1} notice:`, pollErr);
            }
          }
        } else if (mcpData.error) {
          console.error('[LivepeerAgent] MCP create_media error:', mcpData.error);
        } else {
          console.warn('[LivepeerAgent] MCP create_media returned no URL and no job_id:', JSON.stringify(content).slice(0, 500));
        }
      } else {
        console.error('[LivepeerAgent] MCP create_media HTTP failure:', mcpCallRes.status, await mcpCallRes.text().catch(() => ''));
      }
    } catch (err) {
      console.error(`[LivepeerAgent] MCP ${modelToUse} call failed:`, err);
    }

    // Secondary attempt: if seedance-25-t2v was tried and failed, fallback to pixverse-t2v (8s)
    if (!realMediaUrl && isLongForm) {
      try {
        console.log('[LivepeerAgent] seedance-25-t2v fallback: attempting pixverse-t2v (8s)...');
        const pixverseRes = await fetch(this.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json, text/event-stream',
            ...(this.bearer ? { Authorization: `Bearer ${this.bearer}` } : {}),
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'tools/call',
            params: {
              name: 'create_media',
              arguments: {
                action: 'generate',
                prompt: livepeerPrompt,
                model_override: 'pixverse-t2v',
                duration: 8,
              },
            },
          }),
        });

        if (pixverseRes.ok) {
          const pixverseData = await pixverseRes.json();
          if (pixverseData.result?.structuredContent?.url) {
            realMediaUrl = pixverseData.result.structuredContent.url;
            livepeerCapability = 'pixverse-t2v';
            generationDuration = effectiveDuration;
          }
        }
      } catch (pvErr) {
        console.error('[LivepeerAgent] Secondary pixverse fallback failed:', pvErr);
      }
    }

    // Tertiary Fallback: If video models timed out or errored, generate visual asset with flux-schnell
    if (!realMediaUrl) {
      try {
        console.log('[LivepeerAgent] Attempting fast visual render fallback via flux-schnell...');
        const fallbackRes = await fetch(this.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json, text/event-stream',
            ...(this.bearer ? { Authorization: `Bearer ${this.bearer}` } : {}),
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'tools/call',
            params: {
              name: 'create_media',
              arguments: {
                action: 'generate',
                prompt: livepeerPrompt,
                prefer_fast: true,
              },
            },
          }),
        });

        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          if (fallbackData.result?.structuredContent?.url) {
            realMediaUrl = fallbackData.result.structuredContent.url;
            livepeerCapability = fallbackData.result.structuredContent.capability || 'flux-schnell';
          }
        }
      } catch (fbErr) {
        console.error('[LivepeerAgent] Fallback render also failed:', fbErr);
      }
    }

    // STRICT: never substitute a stock clip for a real Livepeer render.
    // If the remote render failed, report the failure honestly instead of
    // returning a placeholder URL masquerading as generated media.
    if (!realMediaUrl) {
      throw new Error(
        'Livepeer Agent did not return generated media. The MCP create_media call failed or returned no URL - no placeholder is substituted (per rules.md NO MOCKING).'
      );
    }

    // Await parallel audio generation if triggered
    let audioUrl: string | null = null;
    try {
      audioUrl = await audioPromise;
    } catch {
      audioUrl = null;
    }

    let finalMediaUrl = realMediaUrl;
    const finalImageUrl = realMediaUrl;

    // Multi-scene sequence assembly and soundtrack muxing via Livepeer assemble MCP tool
    if (clipCount > 1 || audioUrl) {
      try {
        // If we have unique scene prompts from the director, render each scene in parallel
        let clipUrls: string[] = [];

        if (clipCount > 1 && realMediaUrl) {
          clipUrls = [realMediaUrl];
          const remainingPrompts =
            scenePrompts && scenePrompts.length > 1 ? scenePrompts.slice(1, clipCount) : [];

          if (remainingPrompts.length > 0) {
            console.log(
              `[LivepeerAgent] Scene 1 already rendered (${realMediaUrl}). Rendering ${remainingPrompts.length} additional scene(s) in parallel...`
            );
            onProgress?.(60, `Rendering additional scenes (${remainingPrompts.length}) in parallel...`);
            const sceneRenderPromises = remainingPrompts.map(async (scenePrompt, idx) => {
              const sceneIndex = idx + 2;
              const fullScenePrompt = `${scenePrompt}. Visual style: ${visualTheme}. Pacing: ${pacing}. Composition: ${aspectRatio}.`;
              try {
                const sceneRes = await fetch(this.endpoint, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json, text/event-stream',
                    ...(this.bearer ? { Authorization: `Bearer ${this.bearer}` } : {}),
                  },
                  body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: Date.now() + idx,
                    method: 'tools/call',
                    params: {
                      name: 'create_media',
                      arguments: {
                        action: 'generate',
                        prompt: fullScenePrompt,
                        model_override: modelToUse,
                        duration: singleTakeDuration,
                      },
                    },
                  }),
                });

                if (sceneRes.ok) {
                  const sceneData = await sceneRes.json();
                  const content = sceneData.result?.structuredContent;

                  if (content?.url) {
                    console.log(`[LivepeerAgent] Scene ${sceneIndex} rendered immediately: ${content.url}`);
                    return content.url;
                  }

                  // Handle async job (poll for completion) - use same SLA-calibrated attempts as Scene 1
                  if (content?.job_id && (content.status === 'pending' || content.status === 'running' || !content.url)) {
                    const jobId = content.job_id;
                    const sceneMaxAttempts = modelToUse.includes('seedance') ? 80 : 30;
                    console.log(`[LivepeerAgent] Scene ${sceneIndex} async job ${jobId} - polling up to ${sceneMaxAttempts * 5}s...`);
                    for (let attempt = 0; attempt < sceneMaxAttempts; attempt++) {
                      await new Promise((resolve) => setTimeout(resolve, 5000));
                      try {
                        const pollRes = await fetch(this.endpoint, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            Accept: 'application/json, text/event-stream',
                            ...(this.bearer ? { Authorization: `Bearer ${this.bearer}` } : {}),
                          },
                          body: JSON.stringify({
                            jsonrpc: '2.0',
                            id: Date.now(),
                            method: 'tools/call',
                            params: {
                              name: 'get_create_media',
                              arguments: { job_id: jobId },
                            },
                          }),
                        });
                        if (pollRes.ok) {
                          const pollData = await pollRes.json();
                          const pc = pollData.result?.structuredContent;
                          if (pc?.url && pc?.status !== 'pending' && pc?.status !== 'running') {
                            console.log(
                              `[LivepeerAgent] Scene ${sceneIndex} completed: ${pc.url}`
                            );
                            return pc.url;
                          }
                          if (pc?.status === 'failed') break;
                        }
                      } catch {
                        /* continue polling */
                      }
                    }
                  }
                }
              } catch (err) {
                console.warn(`[LivepeerAgent] Scene ${sceneIndex} render failed:`, err);
              }
              return null;
            });

            const sceneResults = await Promise.all(sceneRenderPromises);
            for (const url of sceneResults) {
              if (url) clipUrls.push(url);
            }
            console.log(
              `[LivepeerAgent] ${clipUrls.length}/${clipCount} total scenes ready for assembly`
            );
          }
        } else if (clipCount <= 1 && realMediaUrl) {
          clipUrls = [realMediaUrl];
        }

        const sceneTitles = scenePrompts
          ? scenePrompts.map((_, i) => `Scene ${i + 1}`)
          : [
              'Scene 1: Establishing Hook',
              'Scene 2: Core Narrative Motion',
              'Scene 3: Dynamic Progression',
              'Scene 4: Climactic Finale',
              'Scene 5: Extended Action',
              'Scene 6: Outro & Resolution',
              'Scene 7: Extended Sequence',
              'Scene 8: Final Resolution',
            ];

        console.log(`[LivepeerAgent] Assembling ${clipUrls.length} clips with audio (${audioUrl ? 'with soundtrack' : 'video only'})...`);
        const clipsToAssemble = clipUrls.map((url, i) => ({
          src: url,
          title: sceneTitles[i] || `Scene ${i + 1}`,
        }));

        const assembledUrl = await this.assembleTimeline({
          clips: clipsToAssemble,
          audioUrl: audioUrl || undefined,
          transition: 'cut',
        });
        if (assembledUrl) {
          finalMediaUrl = assembledUrl;
          generationDuration = clipUrls.length * singleTakeDuration;
          livepeerCapability = isLongForm
            ? `${modelToUse} + assemble (${generationDuration}s timeline, ${clipUrls.length} unique scenes)`
            : modelToUse;
          console.log(`[LivepeerAgent] Multi-scene timeline assembled successfully! Duration: ${generationDuration}s, URL: ${finalMediaUrl}`);
        }
      } catch (assembleErr) {
        console.warn('[LivepeerAgent] Livepeer assemble notice:', assembleErr);
      }
    }

    // Build multi-scene storyboard breakdown for professional long-form sequencing
    const storyboardScenes = isLongForm
      ? Array.from({ length: clipCount }, (_, i) => ({
          sceneNumber: i + 1,
          title: scenePrompts?.[i]?.slice(0, 60) || [
            'Establishing Hook',
            'Core Narrative Motion',
            'Dynamic Progression',
            'Climactic Finale',
            'Extended Action',
            'Outro & Resolution',
            'Extended Sequence',
            'Final Resolution',
          ][i] || `Scene ${i + 1}`,
          durationSeconds: singleTakeDuration,
          prompt: scenePrompts?.[i] || `${brief} - Scene ${i + 1}. Visual style: ${visualTheme}. Pacing: ${pacing}.`,
          mediaUrl: finalMediaUrl,
          model: livepeerCapability,
        }))
      : undefined;

    const appliedSummary = appliedPreferences.length > 0
      ? `Applied ${appliedPreferences.length} remembered preferences from Nue Memory: ${appliedPreferences.map((p) => p.category).join(', ')}.`
      : 'Standard baseline generation without prior preferences.';

    const captionHighlight = projectTitle && !projectTitle.toLowerCase().includes('project')
      ? projectTitle.toUpperCase()
      : (visualTheme.includes('Apparel')
          ? 'ELEVATE YOUR STYLE'
          : visualTheme.includes('Mobile') || visualTheme.includes('Application')
          ? 'NEXT GENERATION EXPERIENCE'
          : brief.slice(0, 32).toUpperCase());

    const captionSubtext = brief.length > 50 ? `${brief.slice(0, 48)}...` : brief;

    const audioSummary = audioUrl
      ? ` Synchronized with Livepeer AI soundtrack (${audioStyle}).`
      : '';
    const agentNotes = `Livepeer Agent composed version ${versionNumber} via [${livepeerCapability}]. ${appliedSummary}${audioSummary}`;

    return {
      versionNumber,
      createdAt: new Date().toISOString(),
      brief,
      enrichedBrief,
      appliedPreferences,
      mediaUrl: finalMediaUrl,
      thumbnailUrl: hostedImageUrl || finalImageUrl,
      aspectRatio,
      pacing,
      captionStyle: {
        enabled: true,
        size: captionSize,
        highlight: captionHighlight,
        text: captionSubtext,
      },
      audioStyle: {
        enabled: audioTempo !== 'none',
        style: audioStyle,
        tempo: audioTempo,
        audioUrl: audioUrl || undefined,
      },
      visualTheme,
      agentNotes,
      generationDurationSeconds: generationDuration,
      livepeerCapability,
      scenes: storyboardScenes,
    };
  }
}

export const livepeerAgent = new LivepeerMediaAgent();
