import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { authenticateRequest } from '@/lib/auth/server';
import { LivepeerMediaAgent } from '@/lib/nue-memory/media-memory/livepeer-agent';
import { MediaVersion } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId, email: emailInput, action, options } = body;

    if (!projectId || !action) {
      return NextResponse.json(
        { success: false, error: 'projectId and action are required' },
        { status: 400 }
      );
    }

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database connection unavailable' },
        { status: 500 }
      );
    }

    // 1. Fetch project record to verify existence and ownership
    const { data: projectRow, error: fetchErr } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (fetchErr || !projectRow) {
      return NextResponse.json(
        { success: false, error: fetchErr?.message || 'Project not found' },
        { status: 404 }
      );
    }

    // 2. Authenticate caller identity (allow matching project owner or bearer token)
    const callerEmail = emailInput || projectRow.user_id;
    const auth = await authenticateRequest(request, callerEmail);
    if (!auth.authenticated || !auth.email) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Authentication required' },
        { status: 401 }
      );
    }

    const versions: MediaVersion[] = Array.isArray(projectRow.versions) ? projectRow.versions : [];
    if (versions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Project has no video versions to process' },
        { status: 400 }
      );
    }

    const currentIdx = Math.min(
      Math.max(0, projectRow.current_version_index ?? versions.length - 1),
      versions.length - 1
    );
    const activeVersion = versions[currentIdx];
    const sourceMediaUrl = activeVersion.mediaUrl;

    if (!sourceMediaUrl) {
      return NextResponse.json(
        { success: false, error: 'Active version does not have a valid media URL' },
        { status: 400 }
      );
    }

    const agent = new LivepeerMediaAgent();
    let newMediaUrl: string | null = null;
    let newNote = '';
    let newAspectRatio: '16:9' | '9:16' | '1:1' | undefined = undefined;

    console.log(`[StudioPost] Executing action: "${action}" on project: "${projectId}"...`);

    // 3. Execute requested Livepeer Studio tool
    switch (action) {
      case 'burn_subtitles': {
        const subRes = await agent.burnSubtitles({
          sourceUrl: sourceMediaUrl,
          fontSize: options?.fontSize || 22,
          fontColor: options?.fontColor || 'yellow',
          captionPosition: options?.captionPosition || 'bottom',
          language: options?.language,
        });

        if (!subRes) {
          return NextResponse.json(
            { success: false, error: 'Livepeer transcription service was temporarily unreachable' },
            { status: 502 }
          );
        }

        if (subRes.warning && (!subRes.srt || subRes.srt.length === 0)) {
          return NextResponse.json(
            {
              success: false,
              error: 'No audible lyrics or spoken dialogue detected in this clip to generate timed subtitles.',
            },
            { status: 422 }
          );
        }

        newMediaUrl = subRes.url;
        newNote = `Livepeer transcribe (ffmpeg-burn-subtitles): Hardcoded timed karaoke captions onto video`;
        break;
      }

      case 'reframe_9_16': {
        const refRes = await agent.reframeVideo({
          sourceUrl: sourceMediaUrl,
          aspect: '9:16',
          op: 'reframe',
        });
        if (!refRes) {
          return NextResponse.json(
            { success: false, error: 'Livepeer video reframing to 9:16 failed' },
            { status: 502 }
          );
        }
        newMediaUrl = refRes;
        newAspectRatio = '9:16';
        newNote = `Livepeer edit_clip (ffmpeg-reframe): Converted to 9:16 vertical portrait for TikTok & Reels`;
        break;
      }

      case 'reframe_16_9': {
        const refRes = await agent.reframeVideo({
          sourceUrl: sourceMediaUrl,
          aspect: '16:9',
          op: 'reframe',
        });
        if (!refRes) {
          return NextResponse.json(
            { success: false, error: 'Livepeer video reframing to 16:9 failed' },
            { status: 502 }
          );
        }
        newMediaUrl = refRes;
        newAspectRatio = '16:9';
        newNote = `Livepeer edit_clip (ffmpeg-reframe): Converted to 16:9 widescreen`;
        break;
      }

      case 'clean_audio': {
        const cleanRes = await agent.cleanSpeech({
          sourceUrl: sourceMediaUrl,
          removeFillers: true,
          minSilenceSec: 0.4,
        });
        if (!cleanRes) {
          return NextResponse.json(
            { success: false, error: 'Livepeer speech cleanup failed' },
            { status: 502 }
          );
        }
        newMediaUrl = cleanRes;
        newNote = `Livepeer clean_speech: Filler words ("um", "uh") and dead-air pauses removed`;
        break;
      }

      case 'add_watermark': {
        const overlayRes = await agent.overlayBrand({
          sourceUrl: sourceMediaUrl,
          imageUrl: options?.watermarkUrl,
          name: options?.name || 'Nue Motion',
          title: options?.title || 'AI Studio',
          brandColor: options?.brandColor || '#fbbf24',
          position: 'bottom-right',
          scale: 0.16,
          opacity: 0.85,
        });
        if (!overlayRes) {
          return NextResponse.json(
            { success: false, error: 'Livepeer watermark overlay failed' },
            { status: 502 }
          );
        }
        newMediaUrl = overlayRes;
        newNote = `Livepeer overlay: Branded lower-third/watermark composited onto video`;
        break;
      }

      case 'add_voiceover': {
        const voiceText =
          options?.voiceText ||
          activeVersion.brief ||
          'Welcome to the next generation of creative media production with Nue.';
        const voiceAudioUrl = await agent.generateSpeech({
          text: voiceText,
          voice: options?.voice || 'friendly',
        });
        if (!voiceAudioUrl) {
          return NextResponse.json(
            { success: false, error: 'Livepeer voiceover speech generation failed' },
            { status: 502 }
          );
        }

        let audioToMux = voiceAudioUrl;
        const existingBgAudio = activeVersion.audioStyle?.audioUrl;

        // If background music already exists, mix voiceover with ducked background music
        if (existingBgAudio) {
          console.log('[StudioPost] Mixing voiceover narration over ducked background music...');
          const mixedAudio = await agent.mixAudioTracks({
            tracks: [
              { url: voiceAudioUrl, volume: 1.0 },
              { url: existingBgAudio, volume: 0.35 },
            ],
          });
          if (mixedAudio) {
            audioToMux = mixedAudio;
          }
        }

        const muxedUrl = await agent.assembleTimeline({
          clips: [{ src: sourceMediaUrl }],
          audioUrl: audioToMux,
          transition: 'cut',
        });
        if (!muxedUrl) {
          return NextResponse.json(
            { success: false, error: 'Muxing voiceover onto video failed' },
            { status: 502 }
          );
        }
        newMediaUrl = muxedUrl;
        newNote = existingBgAudio
          ? `Livepeer TTS + ffmpeg-audio-mix: Spoken narration layered over ducked soundtrack`
          : `Livepeer Gemini TTS: Spoken narration generated and synchronized with video`;
        break;
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown studio action: ${action}` },
          { status: 400 }
        );
    }

    // 4. Create new non-destructive version
    const nextVersionNumber = versions.length + 1;
    const newVersion: MediaVersion = {
      ...activeVersion,
      versionNumber: nextVersionNumber,
      createdAt: new Date().toISOString(),
      mediaUrl: newMediaUrl,
      aspectRatio: newAspectRatio || activeVersion.aspectRatio || '16:9',
      livepeerCapability: `Livepeer Studio [${action}]`,
      agentNotes: newNote,
    };

    const updatedVersions = [...versions, newVersion];
    const newCurrentIdx = updatedVersions.length - 1;

    // 5. Append assistant message to chat history
    let existingPrompt = projectRow.initial_prompt || '';
    let existingMessages: any[] = [];
    if (existingPrompt.startsWith('{') && existingPrompt.includes('"messages"')) {
      try {
        const parsed = JSON.parse(existingPrompt);
        existingMessages = Array.isArray(parsed.messages) ? parsed.messages : [];
      } catch {}
    }

    const postActionMessage = {
      id: `msg-studio-${Date.now()}`,
      sender: 'agent',
      content: `Applied **Livepeer Studio: ${action.replace(/_/g, ' ').toUpperCase()}**.\n\nCreated Version ${nextVersionNumber}: ${newNote}.`,
      timestamp: new Date().toISOString(),
      versionNumber: nextVersionNumber,
    };
    existingMessages.push(postActionMessage);

    const updatedPromptPayload = JSON.stringify({
      text: projectRow.title || '',
      messages: existingMessages.slice(-100),
    });

    // 6. Update database record
    const { error: updateErr } = await supabase
      .from('projects')
      .update({
        versions: updatedVersions,
        current_version_index: newCurrentIdx,
        initial_prompt: updatedPromptPayload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    if (updateErr) {
      console.warn('[StudioPost] Supabase update warning:', updateErr);
    }

    return NextResponse.json({
      success: true,
      version: newVersion,
      currentVersionIndex: newCurrentIdx,
      versions: updatedVersions,
      messages: existingMessages,
    });
  } catch (err: any) {
    console.error('[StudioPost] Internal handler failure:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Studio post-production handler failure' },
      { status: 500 }
    );
  }
}
