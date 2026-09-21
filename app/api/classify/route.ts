import { NextResponse } from 'next/server';
import { classifyFeedbackAuto } from '@/lib/nue-memory/extractor';

export async function POST(request: Request) {
  try {
    const { feedback, projectTitle, currentBrief, userId, email, existingMemories } = await request.json();
    const effectiveUserId = userId || email || undefined;

    if (!feedback) {
      return NextResponse.json({ success: false, error: 'Feedback required' }, { status: 400 });
    }

    // Mem0-style: LLM extraction with the user's active memories as dedupe
    // context (falls back to deterministic rules when the LLM is unavailable).
    const classification = await classifyFeedbackAuto(feedback, {
      projectTitle,
      currentBrief,
      userId: effectiveUserId,
      existingMemories: Array.isArray(existingMemories) ? existingMemories : undefined,
    });

    return NextResponse.json({
      success: true,
      classification,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
