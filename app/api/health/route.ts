import { NextResponse } from 'next/server';
import { memWalService } from '@/lib/walrus-memwal/client';

export const dynamic = 'force-dynamic';

/**
 * Honest infrastructure health for dashboard telemetry.
 * Never fabricates "healthy" — reports real configuration and connection state.
 * No secrets are exposed, only presence/absence of configuration.
 */
export async function GET() {
  const walrus = await memWalService.getConnectionState();

  const livepeerConfigured = Boolean(
    process.env.LIVEPEER_API_KEY || process.env.LIVEPEER_AGENT_KEY
  );
  const livepeer = {
    state: livepeerConfigured ? 'configured' : 'missing_keys',
    message: livepeerConfigured
      ? 'Livepeer API key configured — remote MCP media synthesis available.'
      : 'Missing LIVEPEER_API_KEY — media generation is disabled until a key is set.',
  };

  return NextResponse.json({
    walrus,
    livepeer,
    timestamp: new Date().toISOString(),
  });
}
