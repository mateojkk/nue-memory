import { NextResponse } from 'next/server';
import { nue } from '@/lib/nue-memory/sdk';
import { memWalService } from '@/lib/walrus-memwal/client';
import { retrieveAndEnrichBrief } from '@/lib/nue-memory/retrieval';
import { livepeerAgent } from '@/lib/livepeer/agent';

export async function POST(request: Request) {
  try {
    const { brief, versionNumber = 1, projectTitle = 'Media Project', feedbackContext, userId, email, imageUrl } = await request.json();
    const effectiveUserId = userId || email || undefined;

    if (!brief && !imageUrl) {
      return NextResponse.json({ success: false, error: 'Brief or image is required' }, { status: 400 });
    }

    const effectiveBrief = brief || 'Animate and bring this image to life with cinematic motion and depth.';

    // Step 1: Initialize Nue Memory layer and retrieve active preferences from Walrus MemWal for this user's namespace
    await nue.initialize();
    const storedMemories = await memWalService.getAllPreferencesAsync(effectiveUserId, false);
    const { relevantMemories, enrichedBrief, creativeDirectives, summaryTokens } = retrieveAndEnrichBrief(effectiveBrief, storedMemories);

    // Step 2: Send enriched context to Livepeer Agent
    const mediaVersion = await livepeerAgent.generateMedia({
      brief: effectiveBrief,
      enrichedBrief,
      appliedPreferences: relevantMemories,
      versionNumber,
      projectTitle,
      feedbackContext,
      creativeDirectives,
      imageUrl,
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
