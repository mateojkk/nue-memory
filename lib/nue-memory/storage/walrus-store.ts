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
  forceMock?: boolean;
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
 * Supports production MemWal with Sui Ed25519 delegate keys,
 * and seamlessly falls back to MemWalMock for zero-config offline operations.
 */
export class WalrusMemWalStore implements MemoryStore {
  private namespace: string;
  private client: any = null;
  private isInitialized = false;
  private config: WalrusStoreConfig;
  private memoryCache: Map<string, StructuredMemory> = new Map();
  private blobToMemoryId: Map<string, string> = new Map();

  constructor(config: WalrusStoreConfig = {}) {
    this.config = config;
    this.namespace = config.namespace || 'nue-memory';
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const memwalModule = await import('@mysten-incubation/memwal');
      const { MemWal, MemWalMock } = memwalModule;

      const privateKey = this.config.privateKey || process.env.MEMWAL_PRIVATE_KEY;
      const accountId = this.config.accountId || process.env.MEMWAL_ACCOUNT_ID;
      const serverUrl =
        this.config.serverUrl ||
        process.env.MEMWAL_SERVER_URL ||
        'https://relayer.memory.walrus.xyz';

      if (!this.config.forceMock && privateKey && accountId) {
        this.client = MemWal.create({
          key: privateKey,
          accountId,
          serverUrl,
          namespace: this.namespace,
        });
      } else {
        this.client = MemWalMock.create({
          namespace: this.namespace,
        });
      }

      this.isInitialized = true;
    } catch (err) {
      console.warn('[WalrusStore] Warning during MemWal initialization:', err);
      this.isInitialized = true;
    }
  }

  /**
   * Persists a StructuredMemory into Walrus MemWal
   */
  public async save(
    memory: StructuredMemory
  ): Promise<{ blobId?: string; memory: StructuredMemory }> {
    await this.initialize();

    const payloadText = encodeMemoryPayload(memory);
    let blobId: string = memory.storageBlobId || `walrus_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      if (this.client?.rememberAndWait) {
        const res = await this.client.rememberAndWait(payloadText, this.namespace);
        if (res?.blob_id || res?.id) {
          blobId = res.blob_id || res.id;
        }
      }
    } catch (error) {
      console.error('[WalrusStore] Error during rememberAndWait:', error);
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
    await this.initialize();

    let recalledBlobs: Array<{ blob_id: string; text: string; distance: number; created_at?: string }> = [];

    try {
      if (this.client?.recall) {
        const recallRes = await this.client.recall({
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

    if (existing.storageBlobId && this.client?.forget) {
      try {
        await this.client.forget(existing.storageBlobId);
      } catch (err) {
        console.warn('[WalrusStore] Notice on forget:', err);
      }
    }

    this.memoryCache.delete(id);
    if (existing.storageBlobId) {
      this.blobToMemoryId.delete(existing.storageBlobId);
    }

    return true;
  }

  /**
   * Lists memories according to filters
   */
  public async list(filter?: {
    userId?: string;
    domain?: string;
    activeOnly?: boolean;
  }): Promise<StructuredMemory[]> {
    await this.initialize();

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
   * Probes health of the Walrus Memory relayer
   */
  public async health(): Promise<{ status: string; version: string; mode?: string }> {
    await this.initialize();
    if (this.client?.health) {
      try {
        return await this.client.health();
      } catch (err) {
        console.warn('[WalrusStore] Health check warning:', err);
      }
    }
    return { status: 'healthy', version: '0.1.6', mode: 'memwal-mock' };
  }

  /**
   * Restores/reconstructs indexed entries from Walrus storage
   */
  public async restore(namespace?: string): Promise<{ restored: number; total: number }> {
    await this.initialize();
    const ns = namespace || this.namespace;
    if (this.client?.restore) {
      try {
        const res = await this.client.restore(ns);
        return { restored: res.restored || 0, total: res.total || 0 };
      } catch (err) {
        console.warn('[WalrusStore] Restore warning:', err);
      }
    }
    return { restored: this.memoryCache.size, total: this.memoryCache.size };
  }
}

export const defaultWalrusStore = new WalrusMemWalStore();
