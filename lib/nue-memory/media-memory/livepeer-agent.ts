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
        // Poll for audio completion (up to 12 attempts * 4s = 48s)
        for (let i = 0; i < 12; i++) {
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
   * Muxes video clip with audio track using Livepeer assemble tool (ffmpeg-mux)
   */
  private async muxVideoAndAudio(videoUrl: string, audioUrl: string): Promise<string | null> {
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
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: 'assemble',
            arguments: {
              clips: [{ src: videoUrl }],
              music: audioUrl,
              stitch: true,
            },
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
      console.warn('[LivepeerAgent] Video-audio mux notice:', err);
    }
    return null;
  }

  /**
   * Generates a new media version based on the enriched brief and applied preferences
   */
  public async generateMedia(request: GenerateMediaRequest): Promise<MediaVersion> {
    const { brief, enrichedBrief, appliedPreferences, versionNumber, projectTitle, feedbackContext, creativeDirectives } = request;

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
      if (lowerFeedback.includes('music') || lowerFeedback.includes('remove') || lowerFeedback.includes("don't like") || lowerFeedback.includes('avoid')) {
        audioTempo = 'none';
        audioStyle = 'Minimal low-frequency rhythm (cinematic strings muted)';
      }
    }

    // Determine visual subject theme
    if (projectTitle.toLowerCase().includes('clothing') || brief.toLowerCase().includes('clothing') || brief.toLowerCase().includes('fashion')) {
      visualTheme = 'Contemporary Urban Apparel';
    } else if (projectTitle.toLowerCase().includes('app') || brief.toLowerCase().includes('app') || brief.toLowerCase().includes('promo')) {
      visualTheme = 'Next-Gen Mobile Application';
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

    // Determine model dispatch strategy:
    // 1. If explicitly requested seedance OR targetDuration > 8s: Dispatch seedance-25-t2v (up to 30s)
    // 2. If explicitly requested ltx: Dispatch ltx-25-t2v-pro (up to 10s)
    // 3. Otherwise: Use pixverse-t2v clamped to 3, 5, or 8 seconds
    const isLongForm = explicitSeedance || (!explicitPixverse && !explicitLtx && targetDuration > 8);
    const modelToUse = isLongForm
      ? 'seedance-25-t2v'
      : explicitLtx
      ? 'ltx-25-t2v-pro'
      : 'pixverse-t2v';
    const effectiveDuration = isLongForm
      ? Math.min(30, Math.max(10, targetDuration))
      : explicitLtx
      ? Math.min(10, Math.max(3, targetDuration))
      : (targetDuration >= 7 ? 8 : targetDuration >= 4 ? 5 : 3);

    // Build Livepeer prompt that includes prompt directives
    const livepeerPrompt = `${brief}. Visual style: ${visualTheme}. Pacing: ${pacing}. Composition: ${aspectRatio}.`;
    const shouldGenerateSound = audioTempo !== 'none';
    const audioPrompt = `${audioStyle} soundtrack, ${audioTempo === 'energetic' ? 'upbeat driving tempo' : 'smooth ambient tempo'}, subtle synth and modern instrumentation matching ${visualTheme}`;
    const audioPromise = shouldGenerateSound ? this.generateAudioTrack(audioPrompt) : Promise.resolve(null);

    // Attempt real live render call via Livepeer Agent MCP create_media tool
    let realMediaUrl: string | null = null;
    let livepeerCapability = modelToUse;
    let generationDuration = effectiveDuration;

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
            arguments: {
              action: 'generate',
              prompt: livepeerPrompt,
              model_override: modelToUse,
              duration: effectiveDuration,
            },
          },
        }),
      });

      if (mcpCallRes.ok) {
        const mcpData = await mcpCallRes.json();
        const content = mcpData.result?.structuredContent;
        if (content?.url) {
          realMediaUrl = content.url;
          if (content.capability) {
            livepeerCapability = content.capability;
          }
        } else if (content?.job_id && (content.status === 'pending' || content.status === 'running')) {
          // Asynchronous long-form job (e.g. seedance-25-t2v). Poll until complete or max poll threshold reached.
          const jobId = content.job_id;
          console.log(`[LivepeerAgent] Async job ${jobId} initiated for ${modelToUse} (${effectiveDuration}s). Polling...`);
          const maxAttempts = 45; // 45 * 6s = 270s poll window (seedance p50 ~220s)
          for (let attempt = 0; attempt < maxAttempts; attempt++) {
            await new Promise((resolve) => setTimeout(resolve, 6000));
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
                if (pollContent?.url) {
                  realMediaUrl = pollContent.url;
                  livepeerCapability = pollContent.capability || modelToUse;
                  generationDuration = effectiveDuration;
                  console.log(`[LivepeerAgent] Job ${jobId} finished successfully! URL: ${realMediaUrl}`);
                  break;
                }
                if (pollContent?.status === 'failed' || pollContent?.error) {
                  console.warn(`[LivepeerAgent] Job ${jobId} failed:`, pollContent.error);
                  break;
                }
              }
            } catch (pollErr) {
              console.warn(`[LivepeerAgent] Polling attempt ${attempt + 1} notice:`, pollErr);
            }
          }
        } else if (mcpData.error) {
          console.error('[LivepeerAgent] MCP create_media error:', mcpData.error);
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
            generationDuration = 8;
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

    // If both video and audio are ready, attempt Livepeer assemble mux (ffmpeg-mux)
    if (audioUrl) {
      try {
        console.log('[LivepeerAgent] Muxing video with AI soundtrack via Livepeer assemble...');
        const muxedUrl = await this.muxVideoAndAudio(realMediaUrl, audioUrl);
        if (muxedUrl) {
          console.log(`[LivepeerAgent] Mux succeeded! Final muxed URL: ${muxedUrl}`);
          finalMediaUrl = muxedUrl;
        }
      } catch (muxErr) {
        console.warn('[LivepeerAgent] Livepeer mux notice:', muxErr);
      }
    }

    // Build multi-scene storyboard breakdown for professional long-form sequencing
    const storyboardScenes = isLongForm
      ? [
          {
            sceneNumber: 1,
            title: 'Hook / Problem Intro',
            durationSeconds: Math.round(generationDuration * 0.25),
            prompt: `${brief} - Establishing hook. Visual style: ${visualTheme}.`,
            mediaUrl: finalMediaUrl,
            model: livepeerCapability,
          },
          {
            sceneNumber: 2,
            title: 'Feature Demonstration',
            durationSeconds: Math.round(generationDuration * 0.35),
            prompt: `${brief} - Core demonstration sequence. Pacing: ${pacing}.`,
            mediaUrl: finalMediaUrl,
            model: livepeerCapability,
          },
          {
            sceneNumber: 3,
            title: 'Impact / Result',
            durationSeconds: Math.round(generationDuration * 0.25),
            prompt: `${brief} - Dynamic high-energy impact.`,
            mediaUrl: finalMediaUrl,
            model: livepeerCapability,
          },
          {
            sceneNumber: 4,
            title: 'Call to Action',
            durationSeconds: Math.round(generationDuration * 0.15),
            prompt: `${brief} - Final call to action frame.`,
            mediaUrl: finalMediaUrl,
            model: livepeerCapability,
          },
        ]
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
      thumbnailUrl: finalImageUrl,
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
