import { NextResponse } from 'next/server';
import { memWalService } from '@/lib/walrus-memwal/client';

export const dynamic = 'force-dynamic';

/**
 * Honest infrastructure health for dashboard telemetry.
 * Never fabricates "healthy" - reports real configuration and connection state.
 * No secrets are exposed, only presence/absence of configuration.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || searchParams.get('email') || undefined;
  const walrus = await memWalService.getConnectionState(userId);

  const hasLivepeerBearer = Boolean(
    process.env.LIVEPEER_API_KEY || process.env.LIVEPEER_AGENT_KEY
  );
  const livepeer = {
    state: hasLivepeerBearer ? 'configured' : 'demo_tier',
    message: hasLivepeerBearer
      ? 'Livepeer bearer configured - remote MCP media synthesis available.'
      : 'Livepeer keyless hackathon demo tier available - no API key required.',
  };

  return NextResponse.json({
    walrus,
    livepeer,
    timestamp: new Date().toISOString(),
  });
}
