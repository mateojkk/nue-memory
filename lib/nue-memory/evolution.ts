import { MediaPreference } from '../types';
import { planMemoryEvolution } from './engine/evolution';
import { mediaPrefToStructured, structuredToMediaPref } from '../walrus-memwal/client';

export interface EvolutionResult {
  updatedMemories: MediaPreference[];
  supersededMemories: MediaPreference[];
  activeMemories: MediaPreference[];
}

/**
 * Evolves a set of media memories given a newly confirmed preference.
 * Uses the core Nue Memory evolution engine to detect contradictions and maintain provenance.
 */
export function evolveMemories(
  existingMemories: MediaPreference[],
  newPreference: MediaPreference
): EvolutionResult {
  const structuredExisting = existingMemories.map(mediaPrefToStructured);
  const structuredNew = mediaPrefToStructured(newPreference);

  const plan = planMemoryEvolution(structuredExisting, structuredNew);

  const supersededMemories: MediaPreference[] = plan.memoriesToDeactivate.map(structuredToMediaPref);
  const supersededIds = new Set(supersededMemories.map((m) => m.id));

  const updatedMemories: MediaPreference[] = existingMemories.map((m) => {
    if (supersededIds.has(m.id)) {
      return {
        ...m,
        isActive: false,
        updatedAt: new Date().toISOString(),
      };
    }
    return m;
  });

  const persistedPreference: MediaPreference = {
    ...newPreference,
    supersedesId: plan.memoryToPersist.supersedesId,
    isActive: true,
    updatedAt: new Date().toISOString(),
  };

  updatedMemories.push(persistedPreference);
  const activeMemories = updatedMemories.filter((m) => m.isActive);

  return {
    updatedMemories,
    supersededMemories,
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
      if (new Date(mem.createdAt) > new Date(existing.createdAt)) {
        activeByCategory.set(mem.category, mem);
      }
    }
  }

  return Array.from(activeByCategory.values());
}
