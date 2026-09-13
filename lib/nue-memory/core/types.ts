/**
 * Core type taxonomy for Nue Memory
 * Defines the foundational abstractions for AI agent memory.
 * Sits between AI agents and durable decentralized storage.
 */

export type MemoryType =
  | 'preference'    // Durable subjective choice (e.g., "prefers dark mode", "prefers fast intro")
  | 'constraint'    // Invariant restriction (e.g., "never exceed 30 seconds duration")
  | 'fact'          // Objective state or attribute (e.g., "company founded in 2026")
  | 'pattern'       // Inferred recurring behavior
  | 'instruction';  // Explicit rule or standing directive

export type MemoryScope =
  | 'global'        // Universal across all agent sessions and projects
  | 'project'       // Scoped to a specific project or workspace
  | 'domain'        // Scoped to a specific domain (e.g., 'media', 'coding', 'finance')
  | 'session';      // Temporary session context

export type MemoryConfidence = number; // Normalized 0.0 to 1.0

export interface MemorySource {
  type: 'user_feedback' | 'agent_interaction' | 'explicit_statement' | 'system_inference';
  eventContext?: string; // Human-readable provenance (e.g., "Feedback on Project A v1")
  projectId?: string;
  timestamp: string;
}

/**
 * The atomic memory unit in Nue.
 * Encapsulates the assertion, semantic typing, confidence, provenance, and lifecycle state.
 */
export interface StructuredMemory {
  id: string;
  userId: string;
  type: MemoryType;
  category: string;
  value: string;
  confidence: MemoryConfidence;
  scope: MemoryScope;
  domain: string;
  source: MemorySource;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  supersedesId?: string;
  supersededById?: string;
  storageBlobId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Query criteria for retrieving memories
 */
export interface MemoryQuery {
  query: string;
  userId?: string;
  domain?: string;
  category?: string;
  scope?: MemoryScope;
  projectId?: string;
  minConfidence?: number;
  includeSuperseded?: boolean;
  limit?: number;
}

/**
 * Result of memory retrieval with ranking and transparency scores
 */
export interface MemorySearchResult {
  memory: StructuredMemory;
  similarity: number;
  rankScore: number;
  matchReason?: string;
}

/**
 * Persistence abstraction interface for Nue Memory.
 * Decouples memory intelligence from the physical storage engine (e.g., Walrus MemWal).
 */
export interface MemoryStore {
  initialize(): Promise<void>;
  save(memory: StructuredMemory): Promise<{ blobId?: string; memory: StructuredMemory }>;
  get(id: string): Promise<StructuredMemory | null>;
  search(query: MemoryQuery): Promise<MemorySearchResult[]>;
  update(id: string, updates: Partial<StructuredMemory>): Promise<StructuredMemory | null>;
  delete(id: string): Promise<boolean>;
  list(filter?: { userId?: string; domain?: string; activeOnly?: boolean }): Promise<StructuredMemory[]>;
}
