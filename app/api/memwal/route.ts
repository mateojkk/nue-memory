import { NextResponse } from 'next/server';
import { memWalService } from '@/lib/walrus-memwal/client';
import { MediaPreference } from '@/lib/types';
import { checkRateLimit, getClientIdentifier } from '@/lib/security/rate-limit';
import { sanitizeText } from '@/lib/security/sanitize';
import { authenticateRequest } from '@/lib/auth/server';

export const runtime = 'nodejs';
// Walrus recall + tombstone polling can legitimately take over a minute when
// the relayer is congested. Without this the platform kills the function
// mid-poll and the browser reports a bare NetworkError instead of JSON.
export const maxDuration = 120;

/**
 * Maps Walrus configuration failures to an explicit 503 so the UI can render
 * a "Configuration Required" state instead of a generic 500.
 */
function errorResponse(error: unknown) {
  const err = error as Error & { code?: string };
  if (err?.code === 'walrus_config_missing') {
    return NextResponse.json(
      { success: false, error: 'configuration_required', message: err.message },
      { status: 503 }
    );
  }
  return NextResponse.json({ success: false, error: err?.message || String(error) }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userParam = searchParams.get('userId') || searchParams.get('email') || undefined;

    // Authenticate caller identity
    const auth = await authenticateRequest(request, userParam);
    const effectiveUserId = auth.email || userParam || undefined;

    if (!effectiveUserId) {
      return NextResponse.json(
        { success: false, error: 'User email or identity is required. Generic fallback namespaces are disabled.' },
        { status: 400 }
      );
    }

    // Rate limit: 45 requests per minute
    const clientId = getClientIdentifier(request, effectiveUserId);
    const rateCheck = checkRateLimit(`memwal:get:${clientId}`, 45, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please slow down.' },
        { status: 429, headers: { 'Retry-After': String(rateCheck.resetSeconds) } }
      );
    }

    await memWalService.initialize();
    const preferences = await memWalService.getAllPreferencesAsync(effectiveUserId, true);

    const connection = await memWalService.getConnectionState(effectiveUserId);
    return NextResponse.json({
      success: true,
      preferences,
      count: preferences.filter((p) => p.isActive).length,
      totalCount: preferences.length,
      storageLayer: 'MemWal (Walrus Memory on Sui)',
      namespace: connection.namespace,
      connection,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, preference, preferences, id, userId, email } = body;

    // Authenticate caller identity
    const auth = await authenticateRequest(request, userId || email);
    const effectiveUserId = auth.email || userId || email || undefined;

    if (!effectiveUserId) {
      return NextResponse.json(
        { success: false, error: 'User email or identity is required. Generic fallback namespaces are disabled.' },
        { status: 401 }
      );
    }

    // Rate limit: 30 mutations per minute
    const clientId = getClientIdentifier(request, effectiveUserId);
    const rateCheck = checkRateLimit(`memwal:post:${clientId}`, 30, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please slow down.' },
        { status: 429, headers: { 'Retry-After': String(rateCheck.resetSeconds) } }
      );
    }

    if (action === 'remember') {
      const itemsToRemember: MediaPreference[] = preferences || (preference ? [preference] : []);
      if (itemsToRemember.length > 0) {
        // Mem0-style ADD-only persistence: every confirmed rule is appended as
        // a new fact. Nothing is overwritten or deactivated here - contradictions
        // resolve at retrieval ranking (recency-weighted), with full history
        // preserved. Explicit user deletes tombstone via forget.
        const storedItems: { blobId: string; preference: MediaPreference; namespace?: string }[] = [];

        for (const item of itemsToRemember) {
          const itemUserId = item.userId || effectiveUserId || 'default_user';
          const newId = item.id || `pref-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

          const preferenceToPersist: MediaPreference = {
            ...item,
            id: newId,
            userId: itemUserId,
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: true,
            supersedesId: undefined,
          };

          const result = await memWalService.rememberPreference(preferenceToPersist);
          storedItems.push(result);
        }

        const activeList = memWalService.getAllPreferences(effectiveUserId, false);

        return NextResponse.json({
          success: true,
          storedPreference: storedItems[storedItems.length - 1]?.preference,
          storedPreferences: storedItems.map((s) => s.preference),
          blobId: storedItems[storedItems.length - 1]?.blobId,
          blobIds: storedItems.map((s) => s.blobId),
          namespace: storedItems[storedItems.length - 1]?.namespace,
          superseded: [],
          warnings: [],
          totalActiveCount: activeList.length,
        });
      }
    }

    if (action === 'forget' && id) {
      // Fast path: warm cache already holds the id, so tombstone it directly.
      // Slow path: rehydrate from Walrus once (serverless cold-start), then retry.
      // The old code always rehydrated first, adding a full recall round-trip to every delete.
      let removed = await memWalService.forgetPreference(id);
      if (!removed) {
        await memWalService.getAllPreferencesAsync(effectiveUserId, true);
        removed = await memWalService.forgetPreference(id);
      }
      if (!removed) {
        return NextResponse.json(
          { success: false, error: 'Memory not found. It may already be deleted - refresh the tab to sync.' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, removedId: id });
    }

    if (action === 'reset') {
      await memWalService.clearAll();
      return NextResponse.json({ success: true, message: 'All memories cleared' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
}
