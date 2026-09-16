import { NextResponse } from 'next/server';
import { nue } from '@/lib/nue-memory/sdk';
import { memWalService } from '@/lib/walrus-memwal/client';
import { retrieveAndEnrichBrief } from '@/lib/nue-memory/retrieval';
import { livepeerAgent } from '@/lib/livepeer/agent';

export async function POST(request: Request) {
  try {
    const { brief, versionNumber = 1, projectTitle = 'Media Project', feedbackContext } = await request.json();

    if (!brief) {
      return NextResponse.json({ success: false, error: 'Brief is required' }, { status: 400 });
    }

    // Step 1: Initialize Nue Memory layer and retrieve active preferences from Walrus MemWal
    await nue.initialize();
    const storedMemories = await memWalService.getAllPreferencesAsync(false);
    const { relevantMemories, enrichedBrief, creativeDirectives, summaryTokens } = retrieveAndEnrichBrief(brief, storedMemories);

    // Step 2: Send enriched context to Livepeer Agent
    const mediaVersion = await livepeerAgent.generateMedia({
      brief,
      enrichedBrief,
      appliedPreferences: relevantMemories,
      versionNumber,
      projectTitle,
      feedbackContext,
      creativeDirectives,
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
