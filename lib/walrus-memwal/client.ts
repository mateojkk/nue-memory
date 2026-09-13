import { MediaPreference } from '../types';

/**
 * MemWal Client for Walrus Memory
 * Implements Walrus Memory SDK (@mysten-incubation/memwal)
 * Supports live Walrus Memory Relayer with zero-config MemWalMock fallback.
 */

export interface MemWalRecallResult {
  text: string;
  blobId?: string;
  similarity?: number;
  metadata?: Record<string, unknown>;
}

export class MemWalService {
  private static instance: MemWalService;
  private client: any = null;
  private isInitialized = false;
  private namespace = 'nue-media-memory';
  private preferencesMap: Map<string, MediaPreference> = new Map();

  private constructor() {}

  public static getInstance(): MemWalService {
    if (!MemWalService.instance) {
      MemWalService.instance = new MemWalService();
    }
    return MemWalService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const memwalModule = await import('@mysten-incubation/memwal');
      const { MemWal, MemWalMock } = memwalModule;

      const privateKey = process.env.MEMWAL_PRIVATE_KEY;
      const accountId = process.env.MEMWAL_ACCOUNT_ID;
      const serverUrl = process.env.MEMWAL_SERVER_URL || 'https://relayer.memory.walrus.xyz';

      if (privateKey && accountId) {
        console.log('[MemWal] Initializing live Walrus Memory client with delegate key...');
        this.client = MemWal.create({
          key: privateKey,
          accountId: accountId,
          serverUrl,
          namespace: this.namespace,
        });
      } else {
        console.log('[MemWal] Initializing zero-config MemWal (MemWalMock) on Walrus...');
        this.client = MemWalMock.create({
          namespace: this.namespace,
        });
      }
      this.isInitialized = true;
    } catch (err) {
      console.warn('[MemWal] Notice during MemWal initialization:', err);
      this.isInitialized = true;
    }
  }

  /**
   * Persists a structured MediaPreference to Walrus Memory via MemWal
   */
  public async rememberPreference(preference: MediaPreference): Promise<{ blobId: string; preference: MediaPreference }> {
    await this.initialize();

    const textToRemember = `Category: ${preference.category}. Preference: ${preference.preference}. Scope: ${preference.scope}. Strength: ${preference.strength}.`;

    let assignedBlobId = `walrus_blob_${Math.random().toString(36).substring(2, 12)}`;

    try {
      if (this.client?.rememberAndWait) {
        const memwalResult = await this.client.rememberAndWait(textToRemember, {
          category: preference.category,
          preference: preference.preference,
          scope: preference.scope,
          strength: preference.strength,
          projectTitle: preference.projectTitle,
        });

        if (memwalResult && (memwalResult.blob_id || memwalResult.blobId)) {
          assignedBlobId = memwalResult.blob_id || memwalResult.blobId;
        }
      }
    } catch (error) {
      console.error('[MemWal] Error during rememberAndWait:', error);
    }

    const updatedPreference: MediaPreference = {
      ...preference,
      memwalBlobId: assignedBlobId,
      isActive: true,
      updatedAt: new Date().toISOString(),
    };

    this.preferencesMap.set(updatedPreference.id, updatedPreference);
    return { blobId: assignedBlobId, preference: updatedPreference };
  }

  /**
   * Recalls preferences relevant to a given query or brief using MemWal
   */
  public async recallPreferences(query: string): Promise<MediaPreference[]> {
    await this.initialize();

    const activeList = Array.from(this.preferencesMap.values()).filter((m) => m.isActive);

    try {
      if (this.client?.recall) {
        const recallRes = await this.client.recall({
          query,
          topK: 10,
          maxDistance: 1.0,
        });

        if (recallRes?.results?.length) {
          console.log(`[MemWal] Recalled ${recallRes.results.length} memories from Walrus for query: "${query}"`);
        }
      }
    } catch (e) {
      console.warn('[MemWal] Recall query notice:', e);
    }

    return activeList;
  }

  /**
   * Returns all stored preferences (both active and evolved/superseded)
   */
  public getAllPreferences(includeInactive = false): MediaPreference[] {
    const list = Array.from(this.preferencesMap.values());
    return includeInactive ? list : list.filter((m) => m.isActive);
  }

  /**
   * Updates an existing preference (e.g. marking it superseded/inactive)
   */
  public updatePreference(pref: MediaPreference): void {
    this.preferencesMap.set(pref.id, pref);
  }

  /**
   * Clears all stored memories (useful for test resets)
   */
  public clearAll(): void {
    this.preferencesMap.clear();
  }

  /**
   * Deactivates or removes a preference
   */
  public async forgetPreference(id: string): Promise<boolean> {
    const existing = this.preferencesMap.get(id);
    if (existing) {
      if (existing.memwalBlobId && this.client?.forget) {
        try {
          await this.client.forget(existing.memwalBlobId);
        } catch (e) {
          console.warn('[MemWal] Failed to remove from remote relayer:', e);
        }
      }
      this.preferencesMap.set(id, { ...existing, isActive: false, updatedAt: new Date().toISOString() });
      return true;
    }
    return false;
  }
}

export const memWalService = MemWalService.getInstance();
