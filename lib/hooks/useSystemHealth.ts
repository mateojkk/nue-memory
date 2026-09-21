'use client';

import { useCallback, useEffect, useState } from 'react';

export interface ServiceConnection {
  state: string;
  message: string;
}

export interface SystemHealth {
  walrus: ServiceConnection;
  livepeer: ServiceConnection;
  timestamp?: string;
}

const UNKNOWN_HEALTH: SystemHealth = {
  walrus: { state: 'uninitialized', message: 'Checking Walrus connection…' },
  livepeer: { state: 'uninitialized', message: 'Checking Livepeer configuration…' },
};

/**
 * Polls the honest /api/health endpoint for real Walrus and Livepeer
 * connection state. Never assumes "connected" without server confirmation.
 */
export function useSystemHealth(pollMs: number = 30000) {
  const [health, setHealth] = useState<SystemHealth>(UNKNOWN_HEALTH);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/health', { cache: 'no-store' });
      if (res.ok) {
        setHealth(await res.json());
      } else {
        setHealth({
          walrus: { state: 'error', message: `Health endpoint error (HTTP ${res.status}).` },
          livepeer: { state: 'error', message: `Health endpoint error (HTTP ${res.status}).` },
        });
      }
    } catch (err) {
      setHealth({
        walrus: {
          state: 'error',
          message: err instanceof Error ? err.message : 'Health check request failed.',
        },
        livepeer: {
          state: 'error',
          message: err instanceof Error ? err.message : 'Health check request failed.',
        },
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, pollMs);
    return () => clearInterval(timer);
  }, [refresh, pollMs]);

  return { health, isLoading, refresh };
}

/** Shared status styling for connection indicators. */
export function connectionIndicator(state: string, isLoading: boolean) {
  if (isLoading || state === 'uninitialized') {
    return { dotClass: 'w-2 h-2 rounded-full bg-amber-400 animate-pulse', label: 'Checking…' };
  }
  switch (state) {
    case 'connected':
    case 'configured':
    case 'demo_tier':
      return { dotClass: 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse', label: 'Connected' };
    case 'missing_keys':
    case 'not_configured':
      return { dotClass: 'w-2 h-2 rounded-full bg-red-400', label: 'Disconnected / Missing Keys' };
    case 'relayer_unreachable':
      return { dotClass: 'w-2 h-2 rounded-full bg-amber-400', label: 'Relayer Unreachable' };
    default:
      return { dotClass: 'w-2 h-2 rounded-full bg-red-400', label: 'Error' };
  }
}
