/**
 * Provider-enforced ceiling for a single Livepeer `create_media` render: the tool validates
 * `duration` as an integer in [3, 15] and refuses larger values before dispatch
 * (issue_code `too_big`). Anything longer has to be built as several takes.
 */
const MAX_TAKE_SECONDS = 15;

/**
 * Unwraps Livepeer proxy URLs (https://agent.livepeer.org/a/...) to direct cloud storage URLs
 * (https://storage.googleapis.com/...) so browsers can perform byte-range requests and seamless playback.
 */
export function unwrapLivepeerUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.includes('agent.livepeer.org/a/')) {
    const match = url.match(/\/a\/([a-zA-Z0-9_\-=]+)/);
    if (match) {
      try {
        const b64 = match[1].replace(/-/g, '+').replace(/_/g, '/');
        const decoded = typeof Buffer !== 'undefined'
          ? Buffer.from(b64, 'base64').toString('utf8')
          : atob(b64);
        if (decoded.startsWith('http')) {
          return decoded;
        }
      } catch {}
    }
  }
  return url;
}

export class LivepeerMediaAgent {
  private endpoint: string;
  private bearer?: string;
  private isInitialized = false;

  constructor() {
    this.endpoint =
      process.env.LIVEPEER_AGENT_MCP_URL || 'https://agent.livepeer.org/api/mcp/creative';
    this.bearer = process.env.LIVEPEER_API_KEY || process.env.LIVEPEER_AGENT_KEY;
  }

  /**
   * Per-request auth headers. A caller-supplied bearer (the user's own
   * Livepeer key) overrides the server default, so those renders bill the
   * caller's account instead of shared demo credit.
   */
  private authHeaders(bearer?: string): Record<string, string> {
    const token = bearer || this.bearer;
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
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
            clientInfo: { name: 'nue-motion-agent', version: '1.0.0' },
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
   * Generates a master character concept/anchor image via fast image diffusion (flux-schnell, ~2-3s)
   * used to condition all downstream scene takes for 100% character identity consistency.
   */
  public async generateCharacterConcept(conceptPrompt: string, bearer?: string): Promise<string | null> {
    try {
      console.log(`[LivepeerAgent] Generating character concept anchor: "${conceptPrompt.slice(0, 100)}..."`);
      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: this.authHeaders(bearer),
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: 'create_media',
            arguments: {
              action: 'generate',
              prompt: conceptPrompt,
              model_override: 'flux-schnell',
              prefer_fast: true,
              async: false,
            },
          },
        }),
      });

      if (!res.ok) return null;
      const data = await res.json();
      const content = data.result?.structuredContent;
      const textOut = Array.isArray(data.result?.content) ? data.result.content.map((c: any) => c.text).join(' ') : '';
      const url = content?.url || data.result?.content?.find((c: any) => c.type === 'image' || !!c.url)?.url || (textOut.match(/https?:\/\/\S+/) || [])[0];
      if (url) {
        return unwrapLivepeerUrl(url);
      }
    } catch (err) {
      console.warn('[LivepeerAgent] Character concept generation notice:', err);
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
  }, bearer?: string): Promise<string | null> {
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
        headers: this.authHeaders(bearer),
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
        const finalUrl = content?.url || content?.video_url;
        if (finalUrl) {
          return unwrapLivepeerUrl(finalUrl);
        }
      }
    } catch (err) {
      console.warn('[LivepeerAgent] assembleTimeline notice:', err);
    }
    return null;
  }

  /**
   * Dispatches create_media tool call and returns immediately (<5s) with either URL or jobId
   */
  public async dispatchCreateMedia(args: Record<string, any>, bearer?: string): Promise<{
    status: 'completed' | 'running' | 'failed';
    url?: string;
    jobId?: string;
    capability?: string;
    error?: string;
    etaSeconds?: number;
    /** Livepeer-reported estimated USD cost for this dispatch, when provided. */
    costUsd?: number;
    /** Determinism seed echoed by the provider (present when the model accepts seeds). */
    seed?: number;
  }> {
    try {
      const callArgs = {
        async: true,
        ...args,
      };

      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: this.authHeaders(bearer),
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: 'create_media',
            arguments: callArgs,
          },
        }),
      });

      if (!res.ok) {
        return { status: 'failed', error: `Livepeer HTTP failure: ${res.status}` };
      }

      const data = await res.json();
      const content = data.result?.structuredContent;
      if (data.result?.isError || data.error || content?.error) {
        // Livepeer puts the generic message in `structuredContent.error.message` and the
        // actionable detail (e.g. "`duration` must be at most 15") in the text content
        // blocks. Keep both so callers can act on the real reason instead of guessing.
        const textDetail = Array.isArray(data.result?.content)
          ? data.result.content
              .map((block: any) => (typeof block?.text === 'string' ? block.text : ''))
              .filter(Boolean)
              .join(' ')
              .trim()
          : '';
        const structuredDetail = content?.error?.message || data.error?.message;
        return {
          status: 'failed',
          error: [structuredDetail, textDetail].filter(Boolean).join(' ') || 'Livepeer dispatch failed',
        };
      }

      const jobId = content?.job_id;
      const costUsd = typeof content?.cost_usd_estimated === 'number' ? content.cost_usd_estimated : undefined;
      const seed = typeof content?.seed === 'number' ? content.seed : undefined;
      if (content?.url && content?.status !== 'pending' && content?.status !== 'running') {
        return {
          status: 'completed',
          url: unwrapLivepeerUrl(content.url),
          capability: content.capability || args.model_override,
          costUsd,
          seed,
        };
      }

      if (jobId) {
        return {
          status: 'running',
          jobId,
          capability: content?.capability || args.model_override,
          etaSeconds: content?.eta_seconds || (args.model_override?.includes('seedance') ? 240 : 40),
          costUsd,
          seed,
        };
      }

      return { status: 'failed', error: 'No media URL or job ID returned by Livepeer' };
    } catch (err: any) {
      return { status: 'failed', error: err?.message || 'Network error calling Livepeer MCP' };
    }
  }

  /**
   * Fast 150ms check of get_create_media for a given jobId
   */
  public async pollJobStatus(jobId: string, bearer?: string): Promise<{
    status: 'running' | 'completed' | 'failed';
    url?: string;
    capability?: string;
    error?: string;
    /** Actual paid USD cost when reported, else the estimate. */
    costUsd?: number;
    /** Determinism seed echoed by the provider. */
    seed?: number;
  }> {
    try {
      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: this.authHeaders(bearer),
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

      if (!res.ok) {
        return { status: 'running' }; // Transient HTTP status, keep polling
      }

      const data = await res.json();
      const content = data.result?.structuredContent;
      if (content?.url && content?.status !== 'pending' && content?.status !== 'running') {
        const paid = typeof content?.cost_paid_usd === 'number' ? content.cost_paid_usd : undefined;
        const estimated = typeof content?.cost_usd_estimated === 'number' ? content.cost_usd_estimated : undefined;
        const doneSeed = typeof content?.seed === 'number' ? content.seed : undefined;
        return {
          status: 'completed',
          url: unwrapLivepeerUrl(content.url),
          capability: content.capability,
          costUsd: paid ?? estimated,
          seed: doneSeed,
        };
      }

      if (content?.status === 'failed' || content?.error) {
        return {
          status: 'failed',
          error: content.error?.message || (typeof content.error === 'string' ? content.error : 'Render failed'),
        };
      }

      return { status: 'running' };
    } catch {
      return { status: 'running' }; // Network blip, keep polling
    }
  }

  /**
   * Transcribes audio track and burns timed captions directly onto the video using Livepeer transcribe tool (ffmpeg-burn-subtitles)
   */
  public async burnSubtitles(options: {
    sourceUrl: string;
    fontSize?: number;
    fontColor?: string;
    captionPosition?: 'bottom' | 'top' | 'middle';
    language?: string;
  }): Promise<{ url: string; transcript?: string; srt?: string; warning?: string } | null> {
    try {
      const args: Record<string, any> = {
        source_url: options.sourceUrl,
        burn: true,
        caption_position: options.captionPosition || 'bottom',
      };
      if (options.fontSize) args.font_size = options.fontSize;
      if (options.fontColor) args.font_color = options.fontColor;
      if (options.language) args.language = options.language;

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
            name: 'transcribe',
            arguments: args,
          },
        }),
      });

      if (!res.ok) return null;
      const data = await res.json();
      const content = data.result?.structuredContent;
      const finalUrl = content?.url || content?.captioned_video_url || content?.video_url;
      if (finalUrl) {
        return {
          url: unwrapLivepeerUrl(finalUrl),
          transcript: content?.transcript || content?.text,
          srt: content?.srt,
        };
      }
      if (content?.warnings && content.warnings.length > 0) {
        return {
          url: unwrapLivepeerUrl(options.sourceUrl),
          transcript: content?.text || '',
          warning: content.warnings[0],
        };
      }
    } catch (err) {
      console.warn('[LivepeerAgent] burnSubtitles error:', err);
    }
    return null;
  }

  /**
   * Deterministic video finishing edit using Livepeer edit_clip tool (reframe to 9:16, stabilize, denoise)
   */
  public async reframeVideo(options: {
    sourceUrl: string;
    aspect?: '9:16' | '1:1' | '16:9';
    op?: 'reframe' | 'stabilize' | 'denoise' | 'silence_cut' | 'kenburns';
  }): Promise<string | null> {
    try {
      const args: Record<string, any> = {
        source_url: options.sourceUrl,
        op: options.op || 'reframe',
        aspect: options.aspect || '9:16',
      };

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
            name: 'edit_clip',
            arguments: args,
          },
        }),
      });

      if (!res.ok) return null;
      const data = await res.json();
      const content = data.result?.structuredContent;
      const finalUrl = content?.url || content?.video_url;
      if (finalUrl) {
        return unwrapLivepeerUrl(finalUrl);
      }
    } catch (err) {
      console.warn('[LivepeerAgent] reframeVideo error:', err);
    }
    return null;
  }

  /**
   * Overlays watermark logo or branded lower-third onto video using Livepeer overlay tool
   */
  public async overlayBrand(options: {
    sourceUrl: string;
    imageUrl?: string;
    position?: 'top-right' | 'bottom-right' | 'bottom-left' | 'top-left' | 'center';
    scale?: number;
    opacity?: number;
    name?: string;
    title?: string;
    brandColor?: string;
  }): Promise<string | null> {
    try {
      const args: Record<string, any> = {
        source_url: options.sourceUrl,
        position: options.position || 'bottom-right',
        scale: options.scale ?? 0.18,
        opacity: options.opacity ?? 0.9,
      };
      if (options.imageUrl) {
        args.image_url = options.imageUrl;
      } else {
        args.name = options.name || 'Nue Motion';
        args.title = options.title || 'AI Studio';
        args.brand_color = options.brandColor || '#fbbf24';
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
            name: 'overlay',
            arguments: args,
          },
        }),
      });

      if (!res.ok) return null;
      const data = await res.json();
      const content = data.result?.structuredContent;
      const finalUrl = content?.url || content?.video_url;
      if (finalUrl) {
        return unwrapLivepeerUrl(finalUrl);
      }
    } catch (err) {
      console.warn('[LivepeerAgent] overlayBrand error:', err);
    }
    return null;
  }

  /**
   * Tightens spoken video by removing filler words and pauses using Livepeer clean_speech tool
   */
  public async cleanSpeech(options: {
    sourceUrl: string;
    removeFillers?: boolean;
    minSilenceSec?: number;
    fillers?: string[];
    removePhrases?: string[];
  }): Promise<string | null> {
    try {
      const args: Record<string, any> = {
        source_url: options.sourceUrl,
        remove_fillers: options.removeFillers ?? true,
        min_silence_sec: options.minSilenceSec ?? 0.4,
      };
      if (options.fillers) args.fillers = options.fillers;
      if (options.removePhrases) args.remove_phrases = options.removePhrases;

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
            name: 'clean_speech',
            arguments: args,
          },
        }),
      });

      if (!res.ok) return null;
      const data = await res.json();
      const content = data.result?.structuredContent;
      const finalUrl = content?.url || content?.video_url;
      if (finalUrl) {
        return unwrapLivepeerUrl(finalUrl);
      }
    } catch (err) {
      console.warn('[LivepeerAgent] cleanSpeech error:', err);
    }
    return null;
  }

  /**
   * Generates spoken narration voiceover via Livepeer create_media action: 'speech'
   */
  public async generateSpeech(options: {
    text: string;
    voice?: string;
    modelOverride?: string;
  }): Promise<string | null> {
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
            name: 'create_media',
            arguments: {
              action: 'speech',
              text: options.text,
              voice: options.voice || 'friendly',
              model_override: options.modelOverride || 'fal-ai/gemini-3.1-flash-tts',
            },
          },
        }),
      });

      if (!res.ok) return null;
      const data = await res.json();
      const content = data.result?.structuredContent;
      if (content?.url) return unwrapLivepeerUrl(content.url);
      if (content?.job_id) {
        const jobId = content.job_id;
        for (let i = 0; i < 20; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          const poll = await this.pollJobStatus(jobId);
          if (poll.status === 'completed' && poll.url) return poll.url;
          if (poll.status === 'failed') break;
        }
      }
    } catch (err) {
      console.warn('[LivepeerAgent] generateSpeech error:', err);
    }
    return null;
  }

  /**
   * Mixes multiple audio stems (e.g. voiceover narration + ducked background music) using Livepeer ffmpeg-audio-mix
   */
  public async mixAudioTracks(options: {
    tracks: Array<{ url: string; volume?: number; delay_ms?: number }>;
  }): Promise<string | null> {
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
            name: 'create_media',
            arguments: {
              action: 'mix_tracks',
              tracks: options.tracks,
            },
          },
        }),
      });

      if (!res.ok) return null;
      const data = await res.json();
      const content = data.result?.structuredContent;
      if (content?.url) return unwrapLivepeerUrl(content.url);
      if (content?.job_id) {
        const jobId = content.job_id;
        for (let i = 0; i < 20; i++) {
          await new Promise((r) => setTimeout(r, 1500));
          const poll = await this.pollJobStatus(jobId);
          if (poll.status === 'completed' && poll.url) return poll.url;
          if (poll.status === 'failed') break;
        }
      }
    } catch (err) {
      console.warn('[LivepeerAgent] mixAudioTracks error:', err);
    }
    return null;
  }

  /**
   * Places consistent subject/product into lifestyle scenes using Livepeer place_subject tool
   */
  public async placeSubject(options: {
    sourceUrl: string;
    scenes?: string[];
    subjectHint?: string;
  }): Promise<string[] | null> {
    try {
      const args: Record<string, any> = {
        source_url: options.sourceUrl,
        confirm: true,
      };
      if (options.scenes) args.scenes = options.scenes;
      if (options.subjectHint) args.subject_hint = options.subjectHint;

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
            name: 'place_subject',
            arguments: args,
          },
        }),
      });

      if (!res.ok) return null;
      const data = await res.json();
      const content = data.result?.structuredContent;
      if (Array.isArray(content?.urls)) {
        return content.urls.map((u: string) => unwrapLivepeerUrl(u));
      }
    } catch (err) {
      console.warn('[LivepeerAgent] placeSubject error:', err);
    }
    return null;
  }

  /**
   * Saves a persistent brand identity kit on Livepeer using brand_kit_create
   */
  public async createBrandKit(options: {
    name: string;
    palette: string[];
    fonts?: string[];
    logoUrl?: string;
    promptKeywords?: string[];
    forbiddenTerms?: string[];
  }): Promise<any> {
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
            name: 'brand_kit_create',
            arguments: options,
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.result?.structuredContent;
      }
    } catch (err) {
      console.warn('[LivepeerAgent] createBrandKit error:', err);
    }
    return null;
  }

  /**
   * Uploads an image (base64 data URL or external URL) to Livepeer storage via MCP upload_image tool
   */
  public async uploadImage(imageSource: string, bearer?: string): Promise<string | null> {
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
        headers: this.authHeaders(bearer),
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

}

export const livepeerAgent = new LivepeerMediaAgent();
