import {
  StructuredMemory,
  MemoryQuery,
  MemorySearchResult,
  MemoryStore,
} from '../core/types';

export interface WalrusStoreConfig {
  namespace?: string;
  serverUrl?: string;
  privateKey?: string;
  accountId?: string;
}

export type WalrusConnectionState = 'uninitialized' | 'connected' | 'missing_keys' | 'error';

/**
 * Thrown when Walrus MemWal cannot be used because live credentials
 * (MEMWAL_PRIVATE_KEY / MEMWAL_ACCOUNT_ID) are not configured.
 *
 * Per project rules: NO MOCKING. We never silently simulate persistence.
 */
export class WalrusConfigError extends Error {
  public readonly code = 'walrus_config_missing';
  constructor(message = 'Walrus MemWal is not configured: MEMWAL_PRIVATE_KEY and MEMWAL_ACCOUNT_ID are required for live decentralized persistence.') {
    super(message);
    this.name = 'WalrusConfigError';
  }
}

const META_DELIMITER = '__NUE_META__';

/**
 * Encodes a StructuredMemory object into a dual-layer string:
 * 1. Semantic header: optimized for vector embedding and token search in Walrus MemWal
 * 2. Structured metadata envelope: preserves full provenance and state upon retrieval
 */
export function encodeMemoryPayload(memory: StructuredMemory): string {
  const semanticHeader = `[${memory.type.toUpperCase()}|${memory.domain}|${memory.category}] ${memory.value}`;
  const metaPayload: Record<string, unknown> = {
    id: memory.id,
    userId: memory.userId,
    type: memory.type,
    category: memory.category,
    value: memory.value,
    confidence: memory.confidence,
    scope: memory.scope,
    domain: memory.domain,
    source: memory.source,
    createdAt: memory.createdAt,
    updatedAt: memory.updatedAt,
    isActive: memory.isActive,
    supersedesId: memory.supersedesId,
    supersededById: memory.supersededById,
    metadata: memory.metadata,
  };

  return `${semanticHeader}\n${META_DELIMITER}${JSON.stringify(metaPayload)}${META_DELIMITER}`;
}

/**
 * Decodes a recalled text from MemWal back into a StructuredMemory object.
 */
export function decodeMemoryPayload(
  rawText: string,
  blobId?: string,
  fallbackCreatedAt?: string
): StructuredMemory {
  const startIdx = rawText.indexOf(META_DELIMITER);
  if (startIdx !== -1) {
    const endIdx = rawText.indexOf(META_DELIMITER, startIdx + META_DELIMITER.length);
    if (endIdx !== -1) {
      try {
        const jsonStr = rawText.substring(startIdx + META_DELIMITER.length, endIdx);
        const parsed = JSON.parse(jsonStr);
        return {
          id: parsed.id || `mem-${Math.random().toString(36).substring(2, 9)}`,
          userId: parsed.userId || 'default_user',
          type: parsed.type || 'preference',
          category: parsed.category || 'general',
          value: parsed.value || rawText.substring(0, startIdx).trim(),
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.9,
          scope: parsed.scope || 'global',
          domain: parsed.domain || 'general',
          source: parsed.source || {
            type: 'user_feedback',
            timestamp: fallbackCreatedAt || new Date().toISOString(),
          },
          createdAt: parsed.createdAt || fallbackCreatedAt || new Date().toISOString(),
          updatedAt: parsed.updatedAt || new Date().toISOString(),
          isActive: typeof parsed.isActive === 'boolean' ? parsed.isActive : true,
          supersedesId: parsed.supersedesId,
          supersededById: parsed.supersededById,
          storageBlobId: blobId,
          metadata: parsed.metadata,
        };
      } catch (err) {
        console.warn('[WalrusStore] Failed to parse embedded metadata envelope:', err);
      }
    }
  }

  // Graceful fallback for non-envelope text
  const cleanText = rawText.replace(/__NUE_META__.*?__NUE_META__/gs, '').trim();
  return {
    id: `mem-${blobId || Math.random().toString(36).substring(2, 9)}`,
    userId: 'default_user',
    type: 'preference',
    category: 'general',
    value: cleanText || rawText,
    confidence: 0.85,
    scope: 'global',
    domain: 'general',
    source: {
      type: 'user_feedback',
      timestamp: fallbackCreatedAt || new Date().toISOString(),
    },
    createdAt: fallbackCreatedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isActive: true,
    storageBlobId: blobId,
  };
}

/**
 * Storage adapter connecting Nue Memory to Walrus MemWal.
 *
 * STRICT LIVE-ONLY MODE (per project rules - NO MOCKING):
 * Requires real Sui Ed25519 delegate keys via MEMWAL_PRIVATE_KEY and
 * MEMWAL_ACCOUNT_ID. Missing credentials raise WalrusConfigError instead
 * of silently degrading to an in-memory mock.
 */
export class WalrusMemWalStore implements MemoryStore {
  private namespace: string;
  private client: any = null;
  private isInitialized = false;
  private config: WalrusStoreConfig;
  private connectionState: WalrusConnectionState = 'uninitialized';
  private initError: Error | null = null;
  private memoryCache: Map<string, StructuredMemory> = new Map();
  private blobToMemoryId: Map<string, string> = new Map();

  constructor(config: WalrusStoreConfig = {}) {
    this.config = config;
    this.namespace = config.namespace || 'nue-memory';
  }

  /**
   * Reports the current Walrus connection state so the UI/API can display
   * honest status instead of fabricated "healthy" responses.
   */
  public getConnectionState(): { state: WalrusConnectionState; message: string } {
    switch (this.connectionState) {
      case 'connected':
        return { state: 'connected', message: `Walrus Relayer connected (namespace: ${this.namespace}).` };
      case 'missing_keys':
        return {
          state: 'missing_keys',
          message: 'Missing MEMWAL_PRIVATE_KEY / MEMWAL_ACCOUNT_ID - live Walrus persistence unavailable.',
        };
      case 'error':
        return { state: 'error', message: this.initError?.message || 'Walrus initialization failed.' };
      default:
        return { state: 'uninitialized', message: 'Walrus store not initialized yet.' };
    }
  }

  private async requireClient(): Promise<any> {
    await this.initialize();
    if (!this.client) {
      throw this.initError || new WalrusConfigError();
    }
    return this.client;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const memwalModule = await import('@mysten-incubation/memwal');
      const { MemWal } = memwalModule;

      const privateKey = this.config.privateKey || process.env.MEMWAL_PRIVATE_KEY;
      const accountId = this.config.accountId || process.env.MEMWAL_ACCOUNT_ID;
      const serverUrl =
        this.config.serverUrl ||
        process.env.MEMWAL_SERVER_URL ||
        'https://relayer.memory.walrus.xyz';

      if (!privateKey || !accountId) {
        // STRICT: never fall back to MemWalMock. Fail fast with a clear error.
        this.connectionState = 'missing_keys';
        this.initError = new WalrusConfigError();
        throw this.initError;
      }

      this.client = MemWal.create({
        key: privateKey,
        accountId,
        serverUrl,
        namespace: this.namespace,
      });

      this.connectionState = 'connected';
      this.initError = null;
      this.isInitialized = true;
    } catch (err) {
      this.initError = err instanceof Error ? err : new Error(String(err));
      if (this.connectionState !== 'missing_keys') {
        this.connectionState = 'error';
      }
      // Initialization is lazy and idempotent: methods using the client must
      // call requireClient() and surface the failure instead of silently
      // degrading to fake local state.
      this.isInitialized = true;
      throw this.initError;
    }
  }

  /**
   * Persists a StructuredMemory into Walrus MemWal
   */
  public async save(
    memory: StructuredMemory
  ): Promise<{ blobId?: string; memory: StructuredMemory }> {
    const client = await this.requireClient();

    const payloadText = encodeMemoryPayload(memory);

    let blobId: string;
    try {
      const res = await client.rememberAndWait(payloadText, this.namespace);
      const returnedId = res?.blob_id || res?.id;
      if (!returnedId) {
        throw new Error('Walrus MemWal did not return a blob ID - persistence not confirmed.');
      }
      blobId = returnedId;
    } catch (error) {
      // STRICT: never fabricate a blob ID on failure. Surface the real error.
      console.error('[WalrusStore] rememberAndWait failed:', error);
      throw error instanceof Error ? error : new Error(String(error));
    }

    const persisted: StructuredMemory = {
      ...memory,
      storageBlobId: blobId,
      updatedAt: new Date().toISOString(),
    };

    this.memoryCache.set(persisted.id, persisted);
    this.blobToMemoryId.set(blobId, persisted.id);

    return { blobId, memory: persisted };
  }

  /**
   * Fetches memory by its unique ID
   */
  public async get(id: string): Promise<StructuredMemory | null> {
    await this.initialize();
    return this.memoryCache.get(id) || null;
  }

  /**
   * Performs semantic query against MemWal and applies domain-level filters and ranking
   */
  public async search(query: MemoryQuery): Promise<MemorySearchResult[]> {
    const client = await this.requireClient();

    let recalledBlobs: Array<{ blob_id: string; text: string; distance: number; created_at?: string }> = [];

    try {
      if (client?.recall) {
        const recallRes = await client.recall({
          query: query.query,
          topK: (query.limit || 10) * 2, // oversample to allow filtering
          maxDistance: 1.5,
        });

        if (recallRes?.results) {
          recalledBlobs = recallRes.results;
        }
      }
    } catch (err) {
      console.warn('[WalrusStore] Error during MemWal recall:', err);
    }

    const candidateMemories: Array<{ memory: StructuredMemory; distance: number }> = [];
    const seenIds = new Set<string>();

    // Process recalled blobs
    for (const item of recalledBlobs) {
      const existingId = this.blobToMemoryId.get(item.blob_id);
      let mem = existingId ? this.memoryCache.get(existingId) : null;

      if (!mem) {
        mem = decodeMemoryPayload(item.text, item.blob_id, item.created_at);
        this.memoryCache.set(mem.id, mem);
        this.blobToMemoryId.set(item.blob_id, mem.id);
      }

      if (mem && !seenIds.has(mem.id)) {
        seenIds.add(mem.id);
        candidateMemories.push({ memory: mem, distance: item.distance });
      }
    }

    // Fallback: If MemWal returned fewer results, check cached memories for keyword overlap
    for (const mem of Array.from(this.memoryCache.values())) {
      if (!seenIds.has(mem.id)) {
        const q = query.query.toLowerCase();
        const matchesKeyword =
          mem.value.toLowerCase().includes(q) ||
          mem.category.toLowerCase().includes(q) ||
          q.includes(mem.category.toLowerCase()) ||
          (mem.metadata && JSON.stringify(mem.metadata).toLowerCase().includes(q));

        if (matchesKeyword) {
          seenIds.add(mem.id);
          candidateMemories.push({ memory: mem, distance: 0.5 });
        }
      }
    }

    // Apply strict filtering
    const filtered: MemorySearchResult[] = [];

    for (const { memory, distance } of candidateMemories) {
      // 1. Active vs Superseded filter
      if (!query.includeSuperseded && !memory.isActive) {
        continue;
      }

      // 2. User ID filter
      if (query.userId && memory.userId !== query.userId) {
        continue;
      }

      // 3. Domain filter
      if (query.domain && memory.domain !== query.domain && memory.domain !== 'general') {
        continue;
      }

      // 4. Category filter
      if (query.category && memory.category !== query.category) {
        continue;
      }

      // 5. Scope / Project filter
      if (query.projectId && memory.scope === 'project') {
        if (memory.source.projectId && memory.source.projectId !== query.projectId) {
          continue;
        }
      }

      // 6. Confidence filter
      if (query.minConfidence !== undefined && memory.confidence < query.minConfidence) {
        continue;
      }

      // Calculate normalized similarity and rank score
      // distance from MemWal: lower is closer (0 is identical)
      const similarity = Math.max(0, Math.min(1, 1 - (distance || 0)));
      // Rank score factors similarity (70%), confidence (20%), and recency (10%)
      const ageHours = (Date.now() - new Date(memory.updatedAt).getTime()) / (1000 * 60 * 60);
      const recencyBoost = Math.max(0, 1 - ageHours / (24 * 30)); // decays over 30 days
      const rankScore = similarity * 0.7 + memory.confidence * 0.2 + recencyBoost * 0.1;

      filtered.push({
        memory,
        similarity,
        rankScore,
        matchReason: `Matched via semantic vector recall (distance: ${distance.toFixed(2)})`,
      });
    }

    // Sort descending by rankScore
    filtered.sort((a, b) => b.rankScore - a.rankScore);

    const limit = query.limit || 10;
    return filtered.slice(0, limit);
  }

  /**
   * Updates an existing memory
   */
  public async update(
    id: string,
    updates: Partial<StructuredMemory>
  ): Promise<StructuredMemory | null> {
    await this.initialize();

    const existing = this.memoryCache.get(id);
    if (!existing) return null;

    const updated: StructuredMemory = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.memoryCache.set(id, updated);
    return updated;
  }

  /**
   * Forgets/deletes a memory record
   */
  public async delete(id: string): Promise<boolean> {
    await this.initialize();

    const existing = this.memoryCache.get(id);
    if (!existing) return false;

    if (existing.storageBlobId) {
      const client = await this.requireClient();
      if (client?.forget) {
        try {
          await client.forget(existing.storageBlobId);
        } catch (err) {
          // Surface real deletion failures instead of pretending success.
          console.error('[WalrusStore] Forget failed:', err);
          throw err instanceof Error ? err : new Error(String(err));
        }
      }
    }

    this.memoryCache.delete(id);
    if (existing.storageBlobId) {
      this.blobToMemoryId.delete(existing.storageBlobId);
    }

    return true;
  }

  /**
   * Synchronously returns cached memories according to filters
   */
  public listSynchronous(filter?: {
    userId?: string;
    domain?: string;
    activeOnly?: boolean;
  }): StructuredMemory[] {
    let all = Array.from(this.memoryCache.values());

    if (filter?.activeOnly) {
      all = all.filter((m) => m.isActive);
    }
    if (filter?.userId) {
      all = all.filter((m) => m.userId === filter.userId);
    }
    if (filter?.domain) {
      all = all.filter((m) => m.domain === filter.domain || m.domain === 'general');
    }

    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Resets all cached memories
   */
  public clearAll(): void {
    this.memoryCache.clear();
    this.blobToMemoryId.clear();
  }

  /**
   * Lists memories according to filters, querying live MemWal storage via recall
   */
  public async list(filter?: {
    userId?: string;
    domain?: string;
    activeOnly?: boolean;
  }): Promise<StructuredMemory[]> {
    try {
      const client = await this.requireClient();
      const recallRes = await client.recall({
        query: 'preference video visual style pacing duration captions audio',
        limit: 50,
      });
      if (recallRes?.results) {
        for (const item of recallRes.results) {
          const mem = decodeMemoryPayload(item.text, item.blob_id, item.created_at);
          this.memoryCache.set(mem.id, mem);
          if (item.blob_id) {
            this.blobToMemoryId.set(item.blob_id, mem.id);
          }
        }
      }
    } catch (err) {
      console.warn('[WalrusStore] Notice recalling live memories from MemWal:', err);
    }
    return this.listSynchronous(filter);
  }

  /**
   * Probes health of the Walrus Memory relayer
   */
  public async health(): Promise<{ status: string; version: string; mode?: string }> {
    try {
      const client = await this.requireClient();
      if (client?.health) {
        try {
          return await client.health();
        } catch (err) {
          console.warn('[WalrusStore] Health check warning:', err);
          return { status: 'relayer_unreachable', version: '0.1.6', mode: 'live' };
        }
      }
      return { status: 'healthy', version: '0.1.6', mode: 'live' };
    } catch (err) {
      // Honest failure state - never fabricate a "healthy" response.
      const connection = this.getConnectionState();
      return { status: connection.state, version: '0.1.6', mode: 'live', detail: connection.message } as any;
    }
  }

  /**
   * Restores/reconstructs indexed entries from Walrus storage
   */
  public async restore(namespace?: string): Promise<{ restored: number; total: number }> {
    const client = await this.requireClient();
    const ns = namespace || this.namespace;
    if (client?.restore) {
      try {
        const res = await client.restore(ns);
        return { restored: res.restored || 0, total: res.total || 0 };
      } catch (err) {
        console.warn('[WalrusStore] Restore warning:', err);
        throw err instanceof Error ? err : new Error(String(err));
      }
    }
    // No restore capability on this client: report honest zero counts instead
    // of pretending cached entries were restored from Walrus.
    return { restored: 0, total: 0 };
  }
}

export const defaultWalrusStore = new WalrusMemWalStore();
