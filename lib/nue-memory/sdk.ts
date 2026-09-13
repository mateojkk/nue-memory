import { StructuredMemory, MemoryStore, MemorySearchResult } from './core/types';
import { WalrusMemWalStore, defaultWalrusStore } from './storage/walrus-store';
import {
  extractMemories,
  candidateToStructuredMemory,
  MemoryExtractionResult,
} from './engine/extractor';
import { planMemoryEvolution, EvolutionPlan } from './engine/evolution';
import { formatAgentContext, RetrievedContext } from './engine/retrieval';

export interface MemoryClientConfig {
  apiKey?: string;
  store?: MemoryStore;
  namespace?: string;
  defaultUserId?: string;
  defaultDomain?: string;
}

export interface AddOptions {
  userId?: string;
  domain?: string;
  projectId?: string;
  sessionContext?: string;
  autoEvolve?: boolean;
}

export interface SearchOptions {
  userId?: string;
  domain?: string;
  category?: string;
  limit?: number;
  minConfidence?: number;
  includeSuperseded?: boolean;
}

export interface AddResult {
  success: boolean;
  classification: MemoryExtractionResult['classification'];
  reasoning: string;
  extractedCount: number;
  memories: StructuredMemory[];
  temporaryInstructions: string[];
  evolutionPlans: EvolutionPlan[];
}

/**
 * Nue Memory SDK - Developer Interface for AI Agent Memory
 * Sits between AI agents and durable storage (Walrus MemWal on Sui).
 */
export class MemoryClient {
  private store: MemoryStore;
  private defaultUserId: string;
  private defaultDomain: string;

  constructor(config: MemoryClientConfig = {}) {
    this.store = config.store || defaultWalrusStore;
    this.defaultUserId = config.defaultUserId || 'default_user';
    this.defaultDomain = config.defaultDomain || 'general';
  }

  /**
   * Initializes the underlying Walrus MemWal storage engine
   */
  async initialize(): Promise<void> {
    await this.store.initialize();
  }

  /**
   * Add agent interaction:
   * 1. Extracts what matters, differentiating temporary noise from durable preferences.
   * 2. Evaluates semantic conflicts against existing memories (evolution/supersession).
   * 3. Persists structured memories with provenance to Walrus MemWal.
   */
  async add(
    input: string | Array<{ role: string; content: string }>,
    options: AddOptions = {}
  ): Promise<AddResult> {
    await this.store.initialize();

    const userId = options.userId || this.defaultUserId;
    const domain = options.domain || this.defaultDomain;

    // Normalize input text
    const text =
      typeof input === 'string'
        ? input
        : input
            .filter((m) => m.role === 'user' || m.role === 'feedback')
            .map((m) => m.content)
            .join(' ');

    // Stage 1: Extraction & Classification
    const extraction = extractMemories(text, {
      userId,
      domain,
      projectId: options.projectId,
      sessionContext: options.sessionContext,
    });

    if (extraction.candidates.length === 0) {
      return {
        success: true,
        classification: extraction.classification,
        reasoning: extraction.reasoning,
        extractedCount: 0,
        memories: [],
        temporaryInstructions: extraction.temporaryInstructions,
        evolutionPlans: [],
      };
    }

    const savedMemories: StructuredMemory[] = [];
    const evolutionPlans: EvolutionPlan[] = [];

    // Stage 2: Evolution & Persistence
    const existingMemories = await this.store.list({ userId, domain });

    for (const candidate of extraction.candidates) {
      const memoryObj = candidateToStructuredMemory(candidate, {
        userId,
        domain,
        projectId: options.projectId,
        sessionContext: options.sessionContext,
      });

      if (options.autoEvolve !== false) {
        const plan = planMemoryEvolution(existingMemories, memoryObj);
        evolutionPlans.push(plan);

        // Deactivate any superseded memories
        for (const deact of plan.memoriesToDeactivate) {
          await this.store.update(deact.id, {
            isActive: false,
            supersededById: plan.memoryToPersist.id,
          });
        }

        const { memory } = await this.store.save(plan.memoryToPersist);
        savedMemories.push(memory);
      } else {
        const { memory } = await this.store.save(memoryObj);
        savedMemories.push(memory);
      }
    }

    return {
      success: true,
      classification: extraction.classification,
      reasoning: extraction.reasoning,
      extractedCount: savedMemories.length,
      memories: savedMemories,
      temporaryInstructions: extraction.temporaryInstructions,
      evolutionPlans,
    };
  }

  /**
   * Search and retrieve relevant persistent context for any agent task
   */
  async search(
    query: string,
    options: SearchOptions = {}
  ): Promise<StructuredMemory[]> {
    await this.store.initialize();

    const results = await this.store.search({
      query,
      userId: options.userId || this.defaultUserId,
      domain: options.domain || this.defaultDomain,
      category: options.category,
      limit: options.limit,
      minConfidence: options.minConfidence,
      includeSuperseded: options.includeSuperseded,
    });

    return results.map((r) => r.memory);
  }

  /**
   * Search and format memories directly into an agent prompt injection block
   */
  async getContext(
    query: string,
    options: SearchOptions = {}
  ): Promise<RetrievedContext> {
    await this.store.initialize();

    const searchResults = await this.store.search({
      query,
      userId: options.userId || this.defaultUserId,
      domain: options.domain || this.defaultDomain,
      category: options.category,
      limit: options.limit || 6,
      minConfidence: options.minConfidence,
      includeSuperseded: options.includeSuperseded,
    });

    return formatAgentContext(searchResults, {
      maxItems: options.limit || 6,
      domain: options.domain || this.defaultDomain,
    });
  }

  /**
   * Get single memory by ID
   */
  async get(memoryId: string): Promise<StructuredMemory | null> {
    return this.store.get(memoryId);
  }

  /**
   * Update existing memory record
   */
  async update(
    memoryId: string,
    updates: Partial<StructuredMemory>
  ): Promise<StructuredMemory | null> {
    return this.store.update(memoryId, updates);
  }

  /**
   * Delete / forget memory record from Walrus
   */
  async delete(memoryId: string): Promise<boolean> {
    return this.store.delete(memoryId);
  }

  /**
   * Explicitly evolve memory: supersedes an old memory record with new data
   */
  async evolve(
    oldMemoryId: string,
    newMemoryData: Omit<StructuredMemory, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>
  ): Promise<{ superseded: StructuredMemory; active: StructuredMemory } | null> {
    await this.store.initialize();

    const old = await this.store.get(oldMemoryId);
    if (!old) return null;

    const newId = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const superseded: StructuredMemory = {
      ...old,
      isActive: false,
      supersededById: newId,
      updatedAt: now,
    };

    const active: StructuredMemory = {
      ...newMemoryData,
      id: newId,
      supersedesId: oldMemoryId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    await this.store.update(oldMemoryId, {
      isActive: false,
      supersededById: newId,
    });
    const { memory: savedActive } = await this.store.save(active);

    return { superseded, active: savedActive };
  }

  /**
   * List all stored memories
   */
  async list(filter?: {
    userId?: string;
    domain?: string;
    activeOnly?: boolean;
  }): Promise<StructuredMemory[]> {
    return this.store.list(filter);
  }

  /**
   * Check health of Walrus MemWal relayer
   */
  async health(): Promise<{ status: string; version: string; mode?: string }> {
    if ('health' in this.store && typeof (this.store as any).health === 'function') {
      return (this.store as any).health();
    }
    return { status: 'healthy', version: '0.1.6' };
  }

  /**
   * Restore/rebuild indexed entries from Walrus storage
   */
  async restore(namespace?: string): Promise<{ restored: number; total: number }> {
    if ('restore' in this.store && typeof (this.store as any).restore === 'function') {
      return (this.store as any).restore(namespace);
    }
    return { restored: 0, total: 0 };
  }
}

export const nue = new MemoryClient();
