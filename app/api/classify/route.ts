import { NextResponse } from 'next/server';
import { classifyFeedback } from '@/lib/nue-memory/extractor';

export async function POST(request: Request) {
  try {
    const { feedback, projectTitle, currentBrief, userId, email } = await request.json();
    const effectiveUserId = userId || email || undefined;

    if (!feedback) {
      return NextResponse.json({ success: false, error: 'Feedback required' }, { status: 400 });
    }

    const classification = classifyFeedback(feedback, {
      projectTitle,
      currentBrief,
      userId: effectiveUserId,
    });

    return NextResponse.json({
      success: true,
      classification,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
