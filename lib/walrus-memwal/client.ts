import { MediaPreference } from '../types';
import { StructuredMemory } from '../nue-memory/core/types';
import { defaultWalrusStore, WalrusMemWalStore } from '../nue-memory/storage/walrus-store';

/**
 * Adapter converting domain-agnostic StructuredMemory to legacy MediaPreference
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
    userId: 'default_user',
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
   * Persists a structured MediaPreference to Walrus Memory via MemWal
   */
  public async rememberPreference(
    preference: MediaPreference
  ): Promise<{ blobId: string; preference: MediaPreference }> {
    await this.initialize();

    const structured = mediaPrefToStructured(preference);
    const { blobId, memory } = await this.store.save(structured);

    const updatedPref: MediaPreference = {
      ...preference,
      id: memory.id,
      memwalBlobId: blobId || memory.storageBlobId,
      supersedesId: memory.supersedesId,
      isActive: memory.isActive,
      updatedAt: memory.updatedAt,
    };

    this.memoryCache.set(updatedPref.id, updatedPref);
    return { blobId: updatedPref.memwalBlobId || 'walrus_blob', preference: updatedPref };
  }

  /**
   * Recalls preferences relevant to a given query or brief using MemWal semantic vector search
   */
  public async recallPreferences(query: string): Promise<MediaPreference[]> {
    await this.initialize();

    const searchResults = await this.store.search({
      query,
      domain: 'media',
      includeSuperseded: false,
      limit: 10,
    });

    const preferences = searchResults.map((r) => structuredToMediaPref(r.memory));

    // Also populate cache
    for (const p of preferences) {
      this.memoryCache.set(p.id, p);
    }

    return preferences;
  }

  /**
   * Returns all stored preferences (both active and evolved/superseded)
   */
  public getAllPreferences(includeInactive = false): MediaPreference[] {
    const list = Array.from(this.memoryCache.values());
    return includeInactive ? list : list.filter((m) => m.isActive);
  }

  /**
   * Updates an existing preference
   */
  public updatePreference(pref: MediaPreference): void {
    this.memoryCache.set(pref.id, pref);
    this.store.update(pref.id, {
      isActive: pref.isActive,
      supersedesId: pref.supersedesId,
      updatedAt: pref.updatedAt,
    }).catch((err) => console.warn('[MemWalService] Update notice:', err));
  }

  /**
   * Clears stored memory cache
   */
  public clearAll(): void {
    this.memoryCache.clear();
  }

  /**
   * Deactivates or removes a preference from Walrus
   */
  public async forgetPreference(id: string): Promise<boolean> {
    const existing = this.memoryCache.get(id);
    if (existing) {
      await this.store.delete(id);
      this.memoryCache.set(id, {
        ...existing,
        isActive: false,
        updatedAt: new Date().toISOString(),
      });
      return true;
    }
    return false;
  }
}

export const memWalService = MemWalService.getInstance();
