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

    // Build Livepeer prompt that includes prompt directives
    const livepeerPrompt = `${brief}. Visual style: ${visualTheme}. Pacing: ${pacing}. Composition: ${aspectRatio}.`;

    // Attempt real live render call via Livepeer Agent MCP create_media tool
    let realMediaUrl: string | null = null;
    let livepeerCapability = 'pixverse-t2v';
    let generationDuration = pacing === 'fast' ? 15 : 20;

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
              model_override: 'pixverse-t2v',
              duration: 3,
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
      console.error('[LivepeerAgent] MCP pixverse-t2v call failed:', err);
    }

    // Fallback: If pixverse-t2v timed out or errored, generate visual asset with flux-schnell
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

    const appliedSummary = appliedPreferences.length > 0
      ? `Applied ${appliedPreferences.length} remembered preferences from Nue Memory: ${appliedPreferences.map((p) => p.category).join(', ')}.`
      : 'Standard baseline generation without prior preferences.';

    const agentNotes = `Livepeer Agent composed version ${versionNumber} via [${livepeerCapability}]. ${appliedSummary}`;

    const captionHighlight = visualTheme.includes('Apparel') ? 'ELEVATE YOUR STYLE' : 'THE FUTURE OF APPS IS HERE';

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
        text: captionSize === 'large'
          ? 'FAST DISCOVERY • INSTANT ACCESS • SEAMLESS FLOW'
          : 'Discover what is next with effortless performance.',
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
    };
  }
}

export const livepeerAgent = new LivepeerMediaAgent();
