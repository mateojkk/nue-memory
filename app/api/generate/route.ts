import { NextResponse } from 'next/server';
import { nue } from '@/lib/nue-memory/sdk';
import { memWalService } from '@/lib/walrus-memwal/client';
import { retrieveAndEnrichBrief } from '@/lib/nue-memory/retrieval';
import { livepeerAgent } from '@/lib/livepeer/agent';
import { supabase } from '@/lib/supabase/client';
import { checkRateLimit, getClientIdentifier } from '@/lib/security/rate-limit';
import { sanitizeText, validateImageSource } from '@/lib/security/sanitize';
import { authenticateRequest } from '@/lib/auth/server';

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
      const briefCheck = sanitizeText(brief, 1500, 'Brief');
      if (!briefCheck.valid) {
        return NextResponse.json({ success: false, error: briefCheck.error }, { status: 400 });
      }
      sanitizedBrief = briefCheck.sanitized!;
    }

    const titleCheck = sanitizeText(projectTitle, 120, 'Project title');
    const sanitizedTitle = titleCheck.valid ? titleCheck.sanitized! : 'Media Project';

    let sanitizedFeedback: string | undefined;
    if (feedbackContext) {
      const feedbackCheck = sanitizeText(feedbackContext, 1000, 'Feedback context');
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

    // Step 6: Initialize Nue Memory layer and retrieve active preferences from Walrus MemWal
    await nue.initialize();
    const storedMemories = await memWalService.getAllPreferencesAsync(effectiveUserId, false);
    const { relevantMemories, enrichedBrief, creativeDirectives, summaryTokens } = retrieveAndEnrichBrief(sanitizedBrief, storedMemories);

    // Step 7: Send enriched context to Livepeer Agent
    const mediaVersion = await livepeerAgent.generateMedia({
      brief: sanitizedBrief,
      enrichedBrief,
      appliedPreferences: relevantMemories,
      versionNumber: Number(versionNumber) || 1,
      projectTitle: sanitizedTitle,
      feedbackContext: sanitizedFeedback,
      creativeDirectives,
      imageUrl: validatedImageUrl,
    });

    return NextResponse.json({
      success: true,
      mediaVersion,
      enrichedBrief,
      appliedMemories: relevantMemories,
      summaryTokens,
      retrievalCount: relevantMemories.length,
    });
  } catch (error) {
    const err = error as Error & { code?: string };
    if (err?.code === 'walrus_config_missing') {
      return NextResponse.json(
        { success: false, error: 'configuration_required', message: err.message },
        { status: 503 }
      );
    }
    return NextResponse.json({ success: false, error: err?.message || String(error) }, { status: 500 });
  }
}
