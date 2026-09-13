import { StructuredMemory } from '../core/types';

export interface EvolutionPlan {
  action: 'create' | 'supersede' | 'reinforce' | 'noop';
  memoryToPersist: StructuredMemory;
  memoriesToDeactivate: StructuredMemory[];
  reason: string;
}

/**
 * Antonym and mutual exclusion pairs for semantic conflict detection
 */
const CONFLICT_PAIRS: Array<[RegExp, RegExp, string]> = [
  [/dark (?:mode|interfaces?|theme)/i, /light (?:mode|interfaces?|theme)/i, 'Dark theme vs Light theme preference'],
  [/fast|energetic|brisk/i, /slow|calm|cinematic|gentle/i, 'Fast pacing vs Cinematic/Slow pacing'],
  [/large|bigger|prominent/i, /small|subtle|compact/i, 'Large caption size vs Compact caption size'],
  [/avoid|remove|no (?:dramatic|music)/i, /dramatic|orchestral|heavy music/i, 'Avoid dramatic music vs Favor dramatic music'],
  [/9:16|vertical|portrait/i, /16:9|widescreen|horizontal/i, '9:16 vertical format vs 16:9 widescreen format'],
  [/tabs/i, /spaces/i, 'Tabs indentation vs Spaces indentation'],
  [/disable|turn off/i, /enable|turn on/i, 'Feature disabled vs Feature enabled'],
];

/**
 * Evaluates whether two memory values contradict each other
 */
export function areContradictory(valA: string, valB: string): { isConflict: boolean; reason?: string } {
  for (const [patternA, patternB, desc] of CONFLICT_PAIRS) {
    if (
      (patternA.test(valA) && patternB.test(valB)) ||
      (patternB.test(valA) && patternA.test(valB))
    ) {
      return { isConflict: true, reason: desc };
    }
  }

  // Same category with mutually exclusive single-choice attributes
  return { isConflict: false };
}

/**
 * Determines how a newly incoming candidate memory should evolve the existing memory store.
 * Resolves contradictions by superseding older records with bidirectional links.
 */
export function planMemoryEvolution(
  existingMemories: StructuredMemory[],
  candidate: StructuredMemory
): EvolutionPlan {
  const now = new Date().toISOString();

  // Find active memories in the same category and domain
  const matchingActive = existingMemories.filter(
    (m) =>
      m.isActive &&
      m.domain === candidate.domain &&
      m.category === candidate.category &&
      m.userId === candidate.userId
  );

  // If no previous memories in this category, simply create
  if (matchingActive.length === 0) {
    return {
      action: 'create',
      memoryToPersist: candidate,
      memoriesToDeactivate: [],
      reason: `First registered memory for [${candidate.domain}/${candidate.category}].`,
    };
  }

  const memoriesToDeactivate: StructuredMemory[] = [];
  let supersedesTargetId: string | undefined = undefined;

  for (const existing of matchingActive) {
    // 1. Check for exact semantic duplicates (reinforcement)
    if (existing.value.trim().toLowerCase() === candidate.value.trim().toLowerCase()) {
      // Reinforce confidence slightly and bump updatedAt
      const reinforced: StructuredMemory = {
        ...existing,
        confidence: Math.min(1.0, existing.confidence + 0.05),
        updatedAt: now,
      };
      return {
        action: 'reinforce',
        memoryToPersist: reinforced,
        memoriesToDeactivate: [],
        reason: `Preference reinforced: confidence increased to ${reinforced.confidence.toFixed(2)}.`,
      };
    }

    // 2. Check for contradiction or categorical replacement
    const conflictCheck = areContradictory(existing.value, candidate.value);
    const isSingleSlotCategory = [
      'pacing',
      'visual_style',
      'typography',
      'audio',
      'layout',
      'aspect_ratio',
    ].includes(candidate.category);

    if (conflictCheck.isConflict || isSingleSlotCategory) {
      // Conflict or single-slot update detected! Supersede old memory
      const deactivated: StructuredMemory = {
        ...existing,
        isActive: false,
        supersededById: candidate.id,
        updatedAt: now,
      };
      memoriesToDeactivate.push(deactivated);
      supersedesTargetId = existing.id;
    }
  }

  if (memoriesToDeactivate.length > 0) {
    const memoryToPersist: StructuredMemory = {
      ...candidate,
      supersedesId: supersedesTargetId,
      updatedAt: now,
    };

    return {
      action: 'supersede',
      memoryToPersist,
      memoriesToDeactivate,
      reason: `Supersedes ${memoriesToDeactivate.length} older contradictory memory record(s). Newer explicit preference wins.`,
    };
  }

  // Complementary memory within the same category
  return {
    action: 'create',
    memoryToPersist: candidate,
    memoriesToDeactivate: [],
    reason: `Added complementary preference in category [${candidate.category}].`,
  };
}
