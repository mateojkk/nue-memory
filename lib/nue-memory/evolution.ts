import { MediaPreference } from '../types';

export interface EvolutionResult {
  updatedMemories: MediaPreference[];
  supersededMemories: MediaPreference[];
  activeMemories: MediaPreference[];
}

/**
 * Evolves a set of media memories given a newly confirmed preference.
 * Ensures newer preferences supersede older contradictory ones within the same category/domain.
 */
export function evolveMemories(
  existingMemories: MediaPreference[],
  newPreference: MediaPreference
): EvolutionResult {
  const updated: MediaPreference[] = [];
  const superseded: MediaPreference[] = [];

  // Check for conflicts in the same category
  for (const memory of existingMemories) {
    if (!memory.isActive) {
      updated.push(memory);
      continue;
    }

    if (memory.category === newPreference.category && memory.id !== newPreference.id) {
      // Conflict detected! Supersede old memory
      const supersededMemory: MediaPreference = {
        ...memory,
        isActive: false,
        updatedAt: new Date().toISOString(),
      };
      superseded.push(supersededMemory);
      updated.push(supersededMemory);
    } else {
      updated.push(memory);
    }
  }

  // Set supersedes link on the new memory if applicable
  const latestPreference: MediaPreference = {
    ...newPreference,
    supersedesId: superseded.length > 0 ? superseded[0].id : undefined,
    isActive: true,
    updatedAt: new Date().toISOString(),
  };

  updated.push(latestPreference);

  const activeMemories = updated.filter((m) => m.isActive);

  return {
    updatedMemories: updated,
    supersededMemories: superseded,
    activeMemories,
  };
}

/**
 * Deduplicate or consolidate memories if similar preferences exist
 */
export function consolidateMemories(memories: MediaPreference[]): MediaPreference[] {
  const activeByCategory = new Map<string, MediaPreference>();

  for (const mem of memories) {
    if (!mem.isActive) continue;
    const existing = activeByCategory.get(mem.category);
    if (!existing) {
      activeByCategory.set(mem.category, mem);
    } else {
      // Choose newer timestamp
      if (new Date(mem.createdAt) > new Date(existing.createdAt)) {
        activeByCategory.set(mem.category, mem);
      }
    }
  }

  return Array.from(activeByCategory.values());
}
