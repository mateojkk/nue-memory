import { NextResponse } from 'next/server';
import { listPendingRenders } from '@/lib/jobs/pending-renders';
import { checkRateLimit, getClientIdentifier } from '@/lib/security/rate-limit';
import { authenticateRequest } from '@/lib/auth/server';

export const runtime = 'nodejs';

/**
 * Lists the caller's unsettled renders so any device can reattach polling
 * after hours away. Slim descriptors only - the full brief stays server-side
 * and is rehydrated by /api/generate on resume.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userParam = searchParams.get('userId') || searchParams.get('email') || undefined;

    const auth = await authenticateRequest(request, userParam);
    if (!auth.authenticated || !auth.email) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const clientId = getClientIdentifier(request, auth.email);
    const rateCheck = checkRateLimit(`pending:${clientId}`, 30, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ success: false, error: 'Too many requests.' }, { status: 429 });
    }

    const rows = await listPendingRenders(auth.email);
    return NextResponse.json({
      success: true,
      pending: rows.map((r) => ({
        jobId: r.jobId,
        livepeerJobId: r.livepeerJobId,
        scene2JobId: r.scene2JobId,
        audioJobId: r.audioJobId,
        projectId: r.projectId,
        projectTitle: r.projectTitle,
        versionNumber: r.versionNumber,
        startedAt: r.createdAt,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
