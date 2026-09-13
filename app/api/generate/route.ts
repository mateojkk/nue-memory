import { NextResponse } from 'next/server';
import { memWalService } from '@/lib/walrus-memwal/client';
import { retrieveAndEnrichBrief } from '@/lib/nue-memory/retrieval';
import { livepeerAgent } from '@/lib/livepeer/agent';

export async function POST(request: Request) {
  try {
    const { brief, versionNumber = 1, projectTitle = 'Media Project', feedbackContext } = await request.json();

    if (!brief) {
      return NextResponse.json({ success: false, error: 'Brief is required' }, { status: 400 });
    }

    // Step 1: Retrieve relevant memories from MemWal (Walrus Memory)
    await memWalService.initialize();
    const storedMemories = memWalService.getAllPreferences();
    const { relevantMemories, enrichedBrief, creativeDirectives, summaryTokens } = retrieveAndEnrichBrief(brief, storedMemories);

    // Step 2: Send enriched context to Livepeer Agent
    const mediaVersion = await livepeerAgent.generateMedia({
      brief,
      enrichedBrief,
      appliedPreferences: relevantMemories,
      versionNumber,
      projectTitle,
      feedbackContext,
    });

    return NextResponse.json({
      success: true,
      mediaVersion,
      enrichedBrief,
      appliedMemories: relevantMemories,
      summaryTokens,
      retrievalCount: relevantMemories.length,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
