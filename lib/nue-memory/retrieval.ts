/**
 * Retrieval Layer Bridge
 * Core semantic context formatting lives in ./engine/retrieval.
 * Media-specific creative brief enrichment lives in ./media-memory/retrieval.
 */

export { formatAgentContext } from './engine/retrieval';
export type { RetrievedContext } from './engine/retrieval';
export { retrieveAndEnrichBrief } from './media-memory/retrieval';
export type { RetrievalResult } from './media-memory/types';
