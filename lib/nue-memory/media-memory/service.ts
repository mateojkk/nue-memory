import { MediaPreference } from './types';
import { StructuredMemory } from '../core/types';
import { defaultWalrusStore, WalrusMemWalStore } from '../storage/walrus-store';

/**
 * Adapter converting domain-agnostic StructuredMemory to MediaPreference
 */
export function structuredToMediaPref(mem: StructuredMemory): MediaPreference {
  return {
    id: mem.id,
    type: 'media_preference',
    category: mem.category as any,
    preference: mem.value,
    strength: mem.confidence >= 0.9 ? 'high' : mem.confidence >= 0.8 ? 'medium' : 'low',
    scope: mem.scope === 'domain' ? 'media' : mem.scope === 'session' ? 'project' : mem.scope,
    source: 'user_feedback',
    createdAt: mem.createdAt,
    updatedAt: mem.updatedAt,
    projectId: mem.source.projectId,
    projectTitle: mem.source.eventContext,
    userId: mem.userId,
    memwalBlobId: mem.storageBlobId,
    supersedesId: mem.supersedesId,
    isActive: mem.isActive,
  };
}

/**
 * Adapter converting MediaPreference to domain-agnostic StructuredMemory
 */
export function mediaPrefToStructured(pref: MediaPreference): StructuredMemory {
  return {
    id: pref.id || `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId: pref.userId || 'default_user',
    type: 'preference',
    category: pref.category,
    value: pref.preference,
    confidence: pref.strength === 'high' ? 0.95 : pref.strength === 'medium' ? 0.85 : 0.75,
    scope: (pref.scope === 'media' || pref.scope === 'coding') ? 'domain' : (pref.scope === 'project' ? 'project' : 'global'),
    domain: 'media',
    source: {
      type: pref.source === 'manual_entry' ? 'explicit_statement' : 'user_feedback',
      eventContext: pref.projectTitle ? `Project: ${pref.projectTitle}` : 'Media Review Feedback',
      projectId: pref.projectId,
      timestamp: pref.createdAt || new Date().toISOString(),
    },
    createdAt: pref.createdAt || new Date().toISOString(),
    updatedAt: pref.updatedAt || new Date().toISOString(),
    isActive: pref.isActive !== false,
    supersedesId: pref.supersedesId,
    storageBlobId: pref.memwalBlobId,
  };
}

/**
 * MemWal Client for Walrus Memory
 * Bridges Media Memory application workflows directly to the unified WalrusMemWalStore engine.
 */
export class MemWalService {
  private static instance: MemWalService;
  private store: WalrusMemWalStore;
  private memoryCache: Map<string, MediaPreference> = new Map();

  private constructor() {
    this.store = defaultWalrusStore;
  }

  public static getInstance(): MemWalService {
    if (!MemWalService.instance) {
      MemWalService.instance = new MemWalService();
    }
    return MemWalService.instance;
  }

  public async initialize(): Promise<void> {
    await this.store.initialize();
  }

  /**
   * Honest connection state for UI indicators: Disconnected / Missing Keys
   * vs. Walrus Relayer (Connected), scoped to user namespace.
   */
  public async getConnectionState(userId?: string): Promise<{ state: string; message: string; namespace?: string }> {
    try {
      await this.store.initialize();
      return this.store.getConnectionState(userId);
    } catch (err) {
      const conn = this.store.getConnectionState(userId);
      return conn.state !== 'uninitialized' ? conn : {
        state: 'error',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Persists a structured MediaPreference to Walrus Memory via MemWal in the user's namespace
   */
  public async rememberPreference(
    preference: MediaPreference
  ): Promise<{ blobId: string; preference: MediaPreference; namespace?: string }> {
    await this.initialize();

    const structured = mediaPrefToStructured(preference);
    const { blobId, memory, namespace } = await this.store.save(structured);

    const updatedPref: MediaPreference = {
      ...preference,
      id: memory.id,
      userId: memory.userId,
      memwalBlobId: blobId || memory.storageBlobId,
      supersedesId: memory.supersedesId,
      isActive: memory.isActive,
      updatedAt: memory.updatedAt,
    };

    this.memoryCache.set(updatedPref.id, updatedPref);
    return { blobId: updatedPref.memwalBlobId as string, preference: updatedPref, namespace };
  }

  /**
   * Recalls preferences relevant to a given query or brief using MemWal semantic vector search in user's namespace
   */
  public async recallPreferences(query: string, userId?: string): Promise<MediaPreference[]> {
    await this.initialize();

    const searchResults = await this.store.search({
      query,
      domain: 'media',
      userId,
      includeSuperseded: false,
      limit: 10,
    });

    const preferences = searchResults.map((r) => structuredToMediaPref(r.memory));

    for (const p of preferences) {
      this.memoryCache.set(p.id, p);
    }

    return preferences;
  }

  /**
   * Returns all stored preferences (both active and evolved/superseded) for a user
   */
  public getAllPreferences(userId?: string, includeInactive = false): MediaPreference[] {
    const list = this.store.listSynchronous({ userId, activeOnly: !includeInactive });
    return list.map(structuredToMediaPref);
  }

  /**
   * Returns all stored preferences asynchronously for a user from their Walrus namespace
   */
  public async getAllPreferencesAsync(userId?: string, includeInactive = false): Promise<MediaPreference[]> {
    await this.initialize();
    const list = await this.store.list({ userId, activeOnly: !includeInactive });
    return list.map(structuredToMediaPref);
  }

  /**
   * Updates an existing preference. Lifecycle changes are persisted back to
   * Walrus (see WalrusMemWalStore.update); the promise resolves once the
   * marker blob is confirmed so callers can await durability.
   */
  public async updatePreference(pref: MediaPreference): Promise<void> {
    this.memoryCache.set(pref.id, pref);
    try {
      await this.store.update(pref.id, {
        isActive: pref.isActive,
        supersedesId: pref.supersedesId,
        updatedAt: pref.updatedAt,
      });
    } catch (err) {
      console.warn('[MemWalService] Update notice:', err);
      throw err;
    }
  }

  /**
   * Clears stored memory cache. Durable version: tombstones every cached id
   * in Walrus first so a later recall cannot resurrect cleared memories.
   */
  public async clearAll(): Promise<void> {
    const ids = this.store.listSynchronous().map((m) => m.id);
    for (const id of ids) {
      try {
        await this.store.delete(id);
      } catch (err) {
        console.warn('[MemWalService] Reset tombstone notice:', id, err);
      }
    }
    this.memoryCache.clear();
    this.store.clearAll();
  }

  /**
   * Deactivates or removes a preference from Walrus
   */
  public async forgetPreference(id: string): Promise<boolean> {
    const existing = await this.store.get(id);
    if (existing) {
      await this.store.delete(id);
      this.memoryCache.delete(id);
      return true;
    }
    return false;
  }
}

export const memWalService = MemWalService.getInstance();
