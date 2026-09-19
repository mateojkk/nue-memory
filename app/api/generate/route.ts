import { NextResponse } from 'next/server';
import { directCreativeBrief } from '@/lib/ai/nue-director';
import { livepeerAgent } from '@/lib/livepeer/agent';
import { supabase } from '@/lib/supabase/client';
import { checkRateLimit, getClientIdentifier } from '@/lib/security/rate-limit';
import { sanitizeText, validateImageSource } from '@/lib/security/sanitize';
import { authenticateRequest } from '@/lib/auth/server';

export const maxDuration = 300; // Allow up to 5 minutes for long-form video generation

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

    // Step 4: Strict image payload validation (raster only, max 6MB, no SVG/XML)
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

    // Step 6: LLM Creative Director (Groq + withMemWal)
    // withMemWal automatically recalls user memories from Walrus BEFORE the LLM call
    // and auto-saves new preferences to Walrus AFTER the LLM responds
    const directorBrief = await directCreativeBrief(sanitizedBrief, {
      email: effectiveUserId,
      feedbackContext: sanitizedFeedback,
      projectTitle: sanitizedTitle,
      imageUrl: validatedImageUrl,
    });

    // If user is just conversing/greeting, reply immediately without GPU generation
    if (!directorBrief.shouldGenerate) {
      return NextResponse.json({
        success: true,
        mediaVersion: null,
        directorMessage: directorBrief.agentMessage,
        appliedMemories: [],
        summaryTokens: [],
        retrievalCount: 0,
      });
    }

    // Build appliedPreferences-compatible array from director output for backward compat
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

    // Step 7: Send director brief to Livepeer Agent for media generation
    const mediaVersion = await livepeerAgent.generateMedia({
      brief: sanitizedBrief,
      enrichedBrief: directorBrief.enrichedPrompt,
      appliedPreferences: syntheticPreferences,
      versionNumber: Number(versionNumber) || 1,
      projectTitle: sanitizedTitle,
      feedbackContext: sanitizedFeedback,
      creativeDirectives: {
        pacing: directorBrief.pacing,
        audioStyle: directorBrief.audioStyle,
        aspectRatio: directorBrief.aspectRatio,
        visualStyle: directorBrief.visualTheme,
        duration: directorBrief.duration,
        model: directorBrief.model,
      },
      imageUrl: validatedImageUrl,
      scenePrompts: directorBrief.scenePrompts,
    });

    // Duration truthfulness check:
    // Ensure the message truthfully reports the actual rendered video duration
    const actualDuration = mediaVersion.generationDurationSeconds || 5;
    const requestedDuration = directorBrief.duration;
    let truthfulDirectorMessage = directorBrief.agentMessage;

    if (actualDuration >= 24 || actualDuration >= requestedDuration) {
      // Truthfully replace any residual "8-second" references if an assembled sequence was produced
      truthfulDirectorMessage = truthfulDirectorMessage
        .replace(/\b8[- ]seconds?\b/gi, `${actualDuration}-second`)
        .replace(/\b8s\b/gi, `${actualDuration}s`);
    } else if (requestedDuration > actualDuration) {
      const modelCap = mediaVersion.livepeerCapability || 'Livepeer';
      truthfulDirectorMessage = truthfulDirectorMessage
        .replace(/\b\d+[- ]seconds?\b/gi, `${actualDuration}-second`)
        .replace(/\b\d+s\b/gi, `${actualDuration}s`);
      truthfulDirectorMessage += ` Note: Rendered an ${actualDuration}s take (single-shot model limit for ${modelCap}). You can direct subsequent takes to build a longer multi-scene sequence.`;
    }

    return NextResponse.json({
      success: true,
      mediaVersion,
      enrichedBrief: directorBrief.enrichedPrompt,
      appliedMemories: syntheticPreferences,
      directorMessage: truthfulDirectorMessage,
      summaryTokens: [directorBrief.visualTheme, directorBrief.pacing, `${actualDuration}s`],
      retrievalCount: syntheticPreferences.length,
    });
  } catch (error) {
    const err = error as Error & { code?: string };
    if (err?.code === 'walrus_config_missing') {
      return NextResponse.json(
        { success: false, error: 'configuration_required', message: err.message },
        { status: 503 }
      );
    }
    console.error('[generate] Error:', err?.message || error);
    return NextResponse.json({ success: false, error: err?.message || String(error) }, { status: 500 });
  }
}
