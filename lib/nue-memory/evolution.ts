/**
 * Evolution Layer Bridge
 * Core conflict detection & evolution engine lives in ./engine/evolution.
 * Media-specific evolution adapter lives in ./media-memory/evolution.
 */

export { planMemoryEvolution, areContradictory } from './engine/evolution';
export { evolveMemories, consolidateMemories } from './media-memory/evolution';
export type { EvolutionResult } from './media-memory/types';
