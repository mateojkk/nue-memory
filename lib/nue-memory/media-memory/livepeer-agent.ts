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
   * Generates a new media version based on the enriched brief and applied preferences
   */
  public async generateMedia(request: GenerateMediaRequest): Promise<MediaVersion> {
    const { brief, enrichedBrief, appliedPreferences, versionNumber, projectTitle, feedbackContext } = request;

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
      const lower = pref.preference.toLowerCase();
      if (pref.category === 'pacing') {
        if (lower.includes('fast') || lower.includes('energetic')) pacing = 'fast';
        else if (lower.includes('cinematic') || lower.includes('slow') || lower.includes('smooth')) pacing = 'cinematic';
      } else if (pref.category === 'captions' || pref.category === 'typography') {
        if (lower.includes('large') || lower.includes('bigger') || lower.includes('readable')) captionSize = 'large';
        else if (lower.includes('small') || lower.includes('subtle')) captionSize = 'small';
      } else if (pref.category === 'music' || pref.category === 'audio') {
        if (lower.includes('avoid') || lower.includes('remove') || lower.includes('minimal')) {
          audioStyle = 'Subtle minimal rhythm bed (dramatic cinematic strings avoided)';
          audioTempo = 'none';
        } else if (lower.includes('upbeat') || lower.includes('energetic')) {
          audioStyle = 'Punchy modern electronic synth';
          audioTempo = 'energetic';
        }
      } else if (pref.category === 'aspect_ratio' || pref.category === 'layout') {
        if (lower.includes('9:16') || lower.includes('vertical')) aspectRatio = '9:16';
        else if (lower.includes('16:9')) aspectRatio = '16:9';
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

    // Duration parsing: check remembered preferences and feedbackContext
    let targetDuration = 5;
    for (const pref of appliedPreferences) {
      if (pref.category === 'duration' || pref.category === 'length') {
        const match = pref.preference.match(/(\d+)\s*(?:seconds?|secs?|s)/i);
        if (match) {
          targetDuration = Math.max(3, parseInt(match[1], 10));
        }
      }
    }
    if (feedbackContext) {
      const match = feedbackContext.match(/(\d+)\s*(?:seconds?|secs?|s)/i);
      if (match) {
        targetDuration = Math.max(3, parseInt(match[1], 10));
      }
    }

    // Determine model dispatch strategy based on target duration:
    // 1. If targetDuration > 8s: Attempt long-form take via seedance-25-t2v (up to 30s)
    // 2. Otherwise: Use pixverse-t2v clamped to 3, 5, or 8 seconds
    const isLongForm = targetDuration > 8;
    const modelToUse = isLongForm ? 'seedance-25-t2v' : 'pixverse-t2v';
    const effectiveDuration = isLongForm
      ? Math.min(30, Math.max(10, targetDuration))
      : (targetDuration >= 7 ? 8 : targetDuration >= 4 ? 5 : 3);

    // Build Livepeer prompt that includes prompt directives
    const livepeerPrompt = `${brief}. Visual style: ${visualTheme}. Pacing: ${pacing}. Composition: ${aspectRatio}.`;

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
        if (mcpData.result?.structuredContent?.url) {
          realMediaUrl = mcpData.result.structuredContent.url;
          if (mcpData.result.structuredContent.capability) {
            livepeerCapability = mcpData.result.structuredContent.capability;
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

    const finalMediaUrl = realMediaUrl;
    const finalImageUrl = realMediaUrl;

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

    const agentNotes = `Livepeer Agent composed version ${versionNumber} via [${livepeerCapability}]. ${appliedSummary}`;

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
