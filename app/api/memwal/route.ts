import { NextResponse } from 'next/server';
import { memWalService } from '@/lib/walrus-memwal/client';
import { evolveMemories } from '@/lib/nue-memory/evolution';
import { MediaPreference } from '@/lib/types';
import { checkRateLimit, getClientIdentifier } from '@/lib/security/rate-limit';
import { sanitizeText } from '@/lib/security/sanitize';
import { authenticateRequest } from '@/lib/auth/server';
import { supabase } from '@/lib/supabase/client';

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
    let preferences = await memWalService.getAllPreferencesAsync(effectiveUserId, true);

    // Merge in persisted memories from Supabase memories table
    if (supabase) {
      const { data: dbMems } = await supabase
        .from('memories')
        .select('*')
        .eq('user_id', effectiveUserId)
        .eq('is_active', true)
        .neq('category', 'theme')
        .order('created_at', { ascending: false });

      if (dbMems && dbMems.length > 0) {
        const existingTexts = new Set(preferences.map((p) => p.preference.toLowerCase().trim()));
        for (const m of dbMems) {
          if (!existingTexts.has(m.preference.toLowerCase().trim())) {
            preferences.push({
              id: m.id,
              userId: m.user_id,
              type: 'media_preference',
              category: (m.category as any) || 'visual_style',
              preference: m.preference,
              strength: (m.strength as any) || 'high',
              scope: 'media',
              source: 'user_feedback',
              createdAt: m.created_at,
              updatedAt: m.updated_at,
              isActive: m.is_active,
              memwalBlobId: m.memwal_blob_id || undefined,
            });
            existingTexts.add(m.preference.toLowerCase().trim());
          }
        }
      }
    }

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
        const storedItems: { blobId: string; preference: MediaPreference; namespace?: string }[] = [];
        let allSuperseded: MediaPreference[] = [];

        for (const item of itemsToRemember) {
          const itemUserId = item.userId || effectiveUserId || 'default_user';
          const currentPreferences = memWalService.getAllPreferences(itemUserId, true);
          const evolution = evolveMemories(currentPreferences, item);
          const newId = item.id || `pref-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

          for (const superseded of evolution.supersededMemories) {
            const updatedSuperseded: MediaPreference = {
              ...superseded,
              userId: itemUserId,
              isActive: false,
              updatedAt: new Date().toISOString(),
            };
            memWalService.updatePreference(updatedSuperseded);
            allSuperseded.push(updatedSuperseded);
          }

          const preferenceToPersist: MediaPreference = {
            ...item,
            id: newId,
            userId: itemUserId,
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: true,
            supersedesId: evolution.supersededMemories.length > 0 ? evolution.supersededMemories[0].id : undefined,
          };

          const result = await memWalService.rememberPreference(preferenceToPersist);
          storedItems.push(result);
        }

        // Dual persist to Supabase memories table
        if (supabase) {
          for (const item of itemsToRemember) {
            try {
              await supabase.from('memories').upsert({
                id: item.id || `pref_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                user_id: effectiveUserId,
                category: item.category || 'visual_style',
                preference: item.preference,
                strength: item.strength || 'high',
                is_active: true,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'id' });
            } catch (err) {
              console.warn('Supabase memory upsert notice:', err);
            }
          }
        }

        const activeList = memWalService.getAllPreferences(effectiveUserId, false);

        return NextResponse.json({
          success: true,
          storedPreference: storedItems[storedItems.length - 1]?.preference,
          storedPreferences: storedItems.map((s) => s.preference),
          blobId: storedItems[storedItems.length - 1]?.blobId,
          blobIds: storedItems.map((s) => s.blobId),
          namespace: storedItems[storedItems.length - 1]?.namespace,
          superseded: allSuperseded,
          totalActiveCount: activeList.length,
        });
      }
    }

    if (action === 'forget' && id) {
      if (supabase) {
        try {
          await supabase.from('memories').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', id);
        } catch {}
      }
      // Rehydrate user namespace memories from Walrus in case of serverless cold-start
      await memWalService.getAllPreferencesAsync(effectiveUserId, true);
      await memWalService.forgetPreference(id);
      return NextResponse.json({ success: true, removedId: id });
    }

    if (action === 'reset') {
      if (supabase && effectiveUserId) {
        try {
          await supabase.from('memories').update({ is_active: false }).eq('user_id', effectiveUserId);
        } catch {}
      }
      memWalService.clearAll();
      return NextResponse.json({ success: true, message: 'All memories cleared' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
}
