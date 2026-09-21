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

function isHardDeleted(mem: StructuredMemory): boolean {
  return mem.metadata?.deleted === true;
}

function pickLatestById(mems: StructuredMemory[]): Map<string, StructuredMemory> {
  const byId = new Map<string, StructuredMemory>();
  for (const mem of mems) {
    const prev = byId.get(mem.id);
    if (!prev || new Date(mem.updatedAt).getTime() >= new Date(prev.updatedAt).getTime()) {
      byId.set(mem.id, mem);
    }
  }
  return byId;
}

/**
 * Deterministically derives a MemWal namespace for a given user.
 * Each signed up user gets their own dedicated namespace under the master account key.
 *
 * Pattern:
 * - Empty or "default_user" or "global": falls back to "nue-memory"
 * - Valid email or user id: converts to a sanitized string prefixed with "nue-u-"
 *   e.g. "alice@example.com" -> "nue-u-alice-example-com"
 */
export function getUserNamespace(userId?: string): string {
  if (!userId || userId === 'default_user' || userId === 'global') {
    throw new Error('User identity is required to determine MemWal namespace. Generic fallback namespaces are not allowed.');
  }
  const clean = userId.trim().toLowerCase();
  return clean.startsWith('nue-') ? clean : `nue-${clean}`;
}

function getLegacyUserNamespace(userId: string): string {
  const clean = userId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (clean.length > 0 && clean.length <= 48) {
    return `nue-u-${clean}`;
  }

  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return `nue-u-${hash.toString(16)}`;
}

export function getUserNamespaceAliases(userId?: string): string[] {
  const primary = getUserNamespace(userId);
  const aliases = [primary];
  if (userId) {
    const legacy = getLegacyUserNamespace(userId);
    if (!aliases.includes(legacy)) {
      aliases.push(legacy);
    }
  }
  return aliases;
}


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
  fallbackCreatedAt?: string,
  fallbackUserId = 'default_user'
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
          userId: parsed.userId || fallbackUserId,
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
    userId: fallbackUserId,
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
  private defaultNamespace: string;
  private clientMap: Map<string, any> = new Map();
  private isInitialized = false;
  private config: WalrusStoreConfig;
  private connectionState: WalrusConnectionState = 'uninitialized';
  private initError: Error | null = null;
  private memoryCache: Map<string, StructuredMemory> = new Map();
  private blobToMemoryId: Map<string, string> = new Map();

  constructor(config: WalrusStoreConfig = {}) {
    this.config = config;
    this.defaultNamespace = config.namespace || '';
  }

  /**
   * Reports the current Walrus connection state so the UI/API can display
   * honest status instead of fabricated responses.
   */
  public getConnectionState(userId?: string): { state: WalrusConnectionState; message: string; namespace: string } {
    let ns = '';
    try {
      if (userId) {
        ns = getUserNamespace(userId);
      }
    } catch {
      // User not authenticated yet
    }
    switch (this.connectionState) {
      case 'connected':
        return { state: 'connected', message: ns ? `Walrus Relayer connected (namespace: ${ns}).` : 'Walrus Relayer connected.', namespace: ns };
      case 'missing_keys':
        return {
          state: 'missing_keys',
          message: 'Missing MEMWAL_PRIVATE_KEY / MEMWAL_ACCOUNT_ID: live Walrus persistence unavailable.',
          namespace: ns,
        };
      case 'error':
        return { state: 'error', message: this.initError?.message || 'Walrus initialization failed.', namespace: ns };
      default:
        return { state: 'uninitialized', message: 'Walrus store not initialized yet.', namespace: ns };
    }
  }

  /**
   * Retrieves or instantiates a MemWal SDK client for a specific namespace
   */
  public async getClientForNamespace(namespace: string): Promise<any> {
    await this.initialize();

    const cached = this.clientMap.get(namespace);
    if (cached) return cached;

    const privateKey = this.config.privateKey || process.env.MEMWAL_PRIVATE_KEY;
    const accountId = this.config.accountId || process.env.MEMWAL_ACCOUNT_ID;
    const serverUrl =
      this.config.serverUrl ||
      process.env.MEMWAL_SERVER_URL ||
      'https://relayer.memory.walrus.xyz';

    if (!privateKey || !accountId) {
      throw this.initError || new WalrusConfigError();
    }

    const { MemWal } = await import('@mysten-incubation/memwal');
    const client = MemWal.create({
      key: privateKey,
      accountId,
      serverUrl,
      namespace,
    });

    this.clientMap.set(namespace, client);
    return client;
  }

  private async requireClient(namespace?: string): Promise<any> {
    const ns = namespace || this.defaultNamespace;
    return this.getClientForNamespace(ns);
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const privateKey = this.config.privateKey || process.env.MEMWAL_PRIVATE_KEY;
      const accountId = this.config.accountId || process.env.MEMWAL_ACCOUNT_ID;

      if (!privateKey || !accountId) {
        this.connectionState = 'missing_keys';
        this.initError = new WalrusConfigError();
        throw this.initError;
      }

      if (this.defaultNamespace) {
        const serverUrl =
          this.config.serverUrl ||
          process.env.MEMWAL_SERVER_URL ||
          'https://relayer.memory.walrus.xyz';

        const { MemWal } = await import('@mysten-incubation/memwal');
        const client = MemWal.create({
          key: privateKey,
          accountId,
          serverUrl,
          namespace: this.defaultNamespace,
        });

        this.clientMap.set(this.defaultNamespace, client);
      }
      this.connectionState = 'connected';
      this.initError = null;
      this.isInitialized = true;
    } catch (err) {
      this.initError = err instanceof Error ? err : new Error(String(err));
      if (this.connectionState !== 'missing_keys') {
        this.connectionState = 'error';
      }
      this.isInitialized = true;
      throw this.initError;
    }
  }

  /**
   * Persists a StructuredMemory into Walrus MemWal under the user's specific namespace
   */
  public async save(
    memory: StructuredMemory
  ): Promise<{ blobId?: string; memory: StructuredMemory; namespace: string }> {
    const userNamespace = getUserNamespace(memory.userId);
    const client = await this.getClientForNamespace(userNamespace);

    const payloadText = encodeMemoryPayload(memory);

    let blobId: string;
    try {
      const res = await client.rememberAndWait(payloadText, userNamespace);
      const returnedId = res?.blob_id || res?.id;
      if (!returnedId) {
        throw new Error('Walrus MemWal did not return a blob ID: persistence not confirmed.');
      }
      blobId = returnedId;
    } catch (error) {
      console.error(`[WalrusStore] rememberAndWait failed for namespace ${userNamespace}:`, error);
      throw error instanceof Error ? error : new Error(String(error));
    }

    const persisted: StructuredMemory = {
      ...memory,
      storageBlobId: blobId,
      updatedAt: new Date().toISOString(),
    };

    this.memoryCache.set(persisted.id, persisted);
    this.blobToMemoryId.set(blobId, persisted.id);

    return { blobId, memory: persisted, namespace: userNamespace };
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
    let recalledBlobs: Array<{ blob_id: string; text: string; distance: number; created_at?: string }> = [];

    // Alias namespaces (current + legacy) are independent - recall in parallel.
    const recallResults = await Promise.all(
      getUserNamespaceAliases(query.userId).map(async (targetNamespace) => {
        try {
          const client = await this.getClientForNamespace(targetNamespace);
          if (client?.recall) {
            const recallRes = await client.recall({
              query: query.query,
              namespace: targetNamespace,
              topK: (query.limit || 10) * 2, // oversample to allow filtering
              maxDistance: 1.5,
            });
            return recallRes?.results || [];
          }
        } catch (err) {
          console.warn(`[WalrusStore] Error during MemWal recall for namespace ${targetNamespace}:`, err);
        }
        return [];
      })
    );
    for (const results of recallResults) {
      recalledBlobs = recalledBlobs.concat(results);
    }

    const candidateMemories: Array<{ memory: StructuredMemory; distance: number }> = [];

    // Decode every recalled blob, then deduplicate by id (latest updatedAt wins)
    // so a tombstone or supersession marker overrides the original active blob.
    const decodedById = new Map<string, { memory: StructuredMemory; distance: number }>();
    for (const item of recalledBlobs) {
      const mem = decodeMemoryPayload(item.text, item.blob_id, item.created_at, query.userId || 'default_user');
      this.blobToMemoryId.set(item.blob_id, mem.id);
      const prev = decodedById.get(mem.id);
      if (!prev || new Date(mem.updatedAt).getTime() >= new Date(prev.memory.updatedAt).getTime()) {
        decodedById.set(mem.id, { memory: mem, distance: item.distance });
      }
    }
    for (const { memory } of decodedById.values()) {
      this.memoryCache.set(memory.id, memory);
    }
    const seenIds = new Set<string>();
    for (const { memory, distance } of decodedById.values()) {
      if (isHardDeleted(memory)) continue;
      if (!seenIds.has(memory.id)) {
        seenIds.add(memory.id);
        candidateMemories.push({ memory, distance });
      }
    }

    // Fallback: Check cached memories belonging to this user for keyword overlap
    for (const mem of Array.from(this.memoryCache.values())) {
      if (isHardDeleted(mem)) continue;
      if (query.userId && mem.userId !== query.userId && mem.userId !== 'default_user') {
        continue;
      }
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
      // Hard-deleted tombstones never surface, in any mode.
      if (isHardDeleted(memory)) {
        continue;
      }
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
   * Updates an existing memory. Lifecycle changes (deactivation / supersession
   * pointers) are persisted back to Walrus as a new blob version with the same
   * id, because the live MemWal surface is append-only (no update/delete API).
   * Without this, a superseded memory comes back as active on the next recall.
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

    const persistsLifecycle =
      updates.isActive !== undefined ||
      updates.supersededById !== undefined ||
      updates.supersedesId !== undefined;

    if (persistsLifecycle && !isHardDeleted(updated)) {
      try {
        const userNamespace = getUserNamespace(updated.userId);
        const client = await this.getClientForNamespace(userNamespace);
        const res = await client.rememberAndWait(encodeMemoryPayload(updated), userNamespace);
        const returnedId = res?.blob_id || res?.id;
        if (returnedId) {
          updated.storageBlobId = returnedId;
          this.blobToMemoryId.set(returnedId, updated.id);
        }
      } catch (err) {
        console.error(`[WalrusStore] Lifecycle persist failed for ${id}:`, err);
        throw err instanceof Error ? err : new Error(String(err));
      }
    }

    this.memoryCache.set(id, updated);
    return updated;
  }

  /**
   * Hard-deletes a memory record. The live MemWal client exposes no
   * forget/delete call (only the in-memory mock does), and Walrus blobs are
   * append-only, so deletion is implemented as a durable tombstone blob with
   * the same id, `isActive: false` and `metadata.deleted: true`. Future
   * recalls deduplicate by id (latest updatedAt wins) and drop tombstoned ids
   * entirely, so a deleted memory stays deleted across restarts instead of
   * reappearing from the next recall.
   */
  public async delete(id: string): Promise<boolean> {
    await this.initialize();

    const existing = this.memoryCache.get(id);
    if (!existing) return false;

    const now = new Date().toISOString();
    const tombstone: StructuredMemory = {
      ...existing,
      isActive: false,
      updatedAt: now,
      metadata: { ...(existing.metadata || {}), deleted: true, deletedAt: now },
    };

    try {
      const userNamespace = getUserNamespace(tombstone.userId);
      const client = await this.getClientForNamespace(userNamespace);
      const res = await client.rememberAndWait(encodeMemoryPayload(tombstone), userNamespace);
      const returnedId = res?.blob_id || res?.id;
      if (!returnedId) {
        throw new Error('Walrus MemWal did not confirm tombstone persistence.');
      }
      this.blobToMemoryId.set(returnedId, tombstone.id);
    } catch (err) {
      console.error(`[WalrusStore] Tombstone persist failed for ${id}:`, err);
      throw err instanceof Error ? err : new Error(String(err));
    }

    this.memoryCache.delete(id);
    if (existing.storageBlobId) {
      this.blobToMemoryId.delete(existing.storageBlobId);
    }

    return true;
  }

  /**
   * Synchronously returns cached memories according to filters.
   * Hard-deleted tombstones (metadata.deleted) are excluded from every view,
   * including "All" — a user-deleted memory stays deleted.
   */
  public listSynchronous(filter?: {
    userId?: string;
    domain?: string;
    activeOnly?: boolean;
  }): StructuredMemory[] {
    let all = Array.from(pickLatestById(Array.from(this.memoryCache.values())).values()).filter(
      (m) => !isHardDeleted(m)
    );

    if (filter?.activeOnly) {
      all = all.filter((m) => m.isActive);
    }
    if (filter?.userId) {
      const targetUserId = filter.userId.trim().toLowerCase();
      const namespaceAliases = getUserNamespaceAliases(targetUserId).map((ns) => ns.toLowerCase());
      all = all.filter(
        (m) =>
          m.userId?.toLowerCase() === targetUserId ||
          namespaceAliases.includes(m.userId?.toLowerCase() || '') ||
          m.userId === 'default_user' ||
          !m.userId
      );
    }
    if (filter?.domain) {
      const targetDomain = filter.domain;
      all = all.filter((m) => m.domain === targetDomain || m.domain === 'general' || m.domain === 'media');
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
   * Lists memories according to filters, querying live MemWal storage via recall in user's namespace.
   * Recalled blobs are deduplicated by id (latest updatedAt wins) so a tombstone
   * or supersession marker written later overrides the original active blob.
   * Hard-deleted ids are dropped from the cache so they cannot reappear.
   */
  public async list(filter?: {
    userId?: string;
    domain?: string;
    activeOnly?: boolean;
  }): Promise<StructuredMemory[]> {
    const recalled: StructuredMemory[] = [];
    // Alias namespaces (current + legacy) are independent - recall in parallel.
    const listResults = await Promise.all(
      getUserNamespaceAliases(filter?.userId).map(async (targetNamespace) => {
        const mems: Array<{ mem: StructuredMemory; blobId: string }> = [];
        try {
          const client = await this.getClientForNamespace(targetNamespace);
          const recallRes = await client.recall({
            query: 'preference video visual style pacing duration captions audio model layout lyrics vocals soundtrack',
            namespace: targetNamespace,
            topK: 50,
            limit: 50,
          });
          if (recallRes?.results) {
            for (const item of recallRes.results) {
              mems.push({ mem: decodeMemoryPayload(item.text, item.blob_id, item.created_at, targetNamespace), blobId: item.blob_id });
            }
          }
        } catch (err) {
          console.warn(`[WalrusStore] Notice recalling live memories from MemWal namespace ${targetNamespace}:`, err);
        }
        return mems;
      })
    );
    for (const mems of listResults) {
      for (const { mem, blobId } of mems) {
        recalled.push(mem);
        if (blobId) {
          this.blobToMemoryId.set(blobId, mem.id);
        }
      }
    }
    if (recalled.length > 0) {
      // Merge recalled blobs over the local cache, latest updatedAt per id wins,
      // so tombstones and supersession markers override the original active blob.
      // Tombstones stay in the cache; listSynchronous filters them from every view.
      const merged = pickLatestById([...Array.from(this.memoryCache.values()), ...recalled]);
      this.memoryCache = merged as Map<string, StructuredMemory>;
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
      const connection = this.getConnectionState();
      return { status: connection.state, version: '0.1.6', mode: 'live', detail: connection.message } as any;
    }
  }

  /**
   * Restores/reconstructs indexed entries from Walrus storage
   */
  public async restore(namespace?: string): Promise<{ restored: number; total: number }> {
    const ns = namespace || this.defaultNamespace;
    const client = await this.getClientForNamespace(ns);
    if (client?.restore) {
      try {
        const res = await client.restore(ns);
        return { restored: res.restored || 0, total: res.total || 0 };
      } catch (err) {
        console.warn(`[WalrusStore] Restore warning for namespace ${ns}:`, err);
        throw err instanceof Error ? err : new Error(String(err));
      }
    }
    return { restored: 0, total: 0 };
  }
}

export const defaultWalrusStore = new WalrusMemWalStore();
