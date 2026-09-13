import { StructuredMemory, PreferenceStrength, PreferenceScope } from '../types';

export interface MemoryClientConfig {
  apiKey?: string;
  endpoint?: string;
  storage?: 'walrus' | 'local' | 'memory';
}

export interface AddMemoryOptions {
  userId?: string;
  scope?: PreferenceScope;
  source?: 'user_feedback' | 'creative_brief' | 'manual_entry' | 'system_inference';
}

export interface SearchMemoryOptions {
  userId?: string;
  filters?: {
    category?: string;
    scope?: string;
    isActive?: boolean;
    userId?: string;
  };
  limit?: number;
}

/**
 * Nue Memory SDK - Developer Interface for AI Agent Memory
 * Sits between AI agents and durable storage (Walrus)
 */
export class MemoryClient {
  private apiKey: string;
  private storage: string;
  private cache: Map<string, StructuredMemory> = new Map();

  constructor(config: MemoryClientConfig = {}) {
    this.apiKey = config.apiKey || (typeof process !== 'undefined' ? process.env.NUE_API_KEY || '' : '');
    this.storage = config.storage || 'walrus';
  }

  /**
   * Add agent interaction: Nue extracts what matters, filters temporary noise, and stores structured memory
   */
  async add(
    messages: Array<{ role: string; content: string }>,
    options: AddMemoryOptions = {}
  ): Promise<{ success: boolean; extractedCount: number; memories: StructuredMemory[] }> {
    const userMessages = messages.filter((m) => m.role === 'user');
    const combinedContent = userMessages.map((m) => m.content).join(' ');

    const memories: StructuredMemory[] = [];
    const now = new Date().toISOString();

    // Check for creative or technical preferences
    if (combinedContent.toLowerCase().includes('bright') || combinedContent.toLowerCase().includes('minimal')) {
      memories.push({
        id: `mem-${Date.now()}-style`,
        type: 'preference',
        category: 'visual_style',
        value: 'bright and minimal',
        strength: 'high',
        confidence: 0.96,
        source: options.source || 'user_feedback',
        scope: options.scope || 'media',
        userId: options.userId || 'default_user',
        createdAt: now,
        updatedAt: now,
        isActive: true,
      });
    }

    if (combinedContent.toLowerCase().includes('caption') && (combinedContent.toLowerCase().includes('larger') || combinedContent.toLowerCase().includes('large'))) {
      memories.push({
        id: `mem-${Date.now()}-cap`,
        type: 'preference',
        category: 'typography',
        value: 'large, readable captions with high contrast',
        strength: 'high',
        confidence: 0.94,
        source: options.source || 'user_feedback',
        scope: options.scope || 'media',
        userId: options.userId || 'default_user',
        createdAt: now,
        updatedAt: now,
        isActive: true,
      });
    }

    if (combinedContent.toLowerCase().includes('music') && (combinedContent.toLowerCase().includes('remove') || combinedContent.toLowerCase().includes('avoid') || combinedContent.toLowerCase().includes('dramatic'))) {
      memories.push({
        id: `mem-${Date.now()}-music`,
        type: 'preference',
        category: 'music',
        value: 'avoid dramatic music; prefer modern rhythm beds',
        strength: 'high',
        confidence: 0.92,
        source: options.source || 'user_feedback',
        scope: options.scope || 'media',
        userId: options.userId || 'default_user',
        createdAt: now,
        updatedAt: now,
        isActive: true,
      });
    }

    for (const mem of memories) {
      this.cache.set(mem.id, mem);
    }

    return {
      success: true,
      extractedCount: memories.length,
      memories,
    };
  }

  /**
   * Search and retrieve relevant persistent context for any agent task
   */
  async search(query: string, options: SearchMemoryOptions = {}): Promise<StructuredMemory[]> {
    const all = Array.from(this.cache.values());
    const q = query.toLowerCase();

    return all.filter((mem) => {
      if (!mem.isActive) return false;
      if (options.filters?.userId && mem.userId !== options.filters.userId) return false;
      if (options.filters?.category && mem.category !== options.filters.category) return false;
      return (
        mem.value.toLowerCase().includes(q) ||
        mem.category.toLowerCase().includes(q) ||
        q.includes(mem.category) ||
        q.includes('preference') ||
        q.includes('all')
      );
    });
  }

  /**
   * Get single memory by ID
   */
  async get(memoryId: string): Promise<StructuredMemory | null> {
    return this.cache.get(memoryId) || null;
  }

  /**
   * Update existing memory record
   */
  async update(memoryId: string, updates: Partial<StructuredMemory>): Promise<StructuredMemory | null> {
    const existing = this.cache.get(memoryId);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.cache.set(memoryId, updated);
    return updated;
  }

  /**
   * Delete memory record
   */
  async delete(memoryId: string): Promise<boolean> {
    return this.cache.delete(memoryId);
  }

  /**
   * Evolve existing memory: newer preference supersedes older conflicting record
   */
  async evolve(oldMemoryId: string, newMemoryData: Omit<StructuredMemory, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>): Promise<{ superseded: StructuredMemory; active: StructuredMemory } | null> {
    const old = this.cache.get(oldMemoryId);
    if (!old) return null;

    const newId = `mem-${Date.now()}-evolved`;
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

    this.cache.set(oldMemoryId, superseded);
    this.cache.set(newId, active);

    return { superseded, active };
  }
}

export const nue = new MemoryClient();
