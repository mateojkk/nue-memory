/**
 * Root Types Re-export Bridge
 * All Media Memory domain types are now modularly defined in @/lib/nue-memory/media-memory/types.
 * Core domain-agnostic Nue types are defined in @/lib/nue-memory/core/types.
 */

export * from './nue-memory/media-memory/types';
export type {
  StructuredMemory as CoreStructuredMemory,
  MemoryType,
  MemorySource,
  MemoryQuery,
  MemorySearchResult,
  MemoryStore,
} from './nue-memory/core/types';

// Backward compatibility alias for legacy StructuredMemory in lib/types
export type { StructuredMemory } from './nue-memory/core/types';
