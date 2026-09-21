/**
 * Retrieval Layer Bridge
 * Core semantic context formatting lives in ./engine/retrieval.
 * Media-specific creative brief enrichment lives in ./nue-motion/retrieval.
 */

export { formatAgentContext } from './engine/retrieval';
export type { RetrievedContext } from './engine/retrieval';
export { retrieveAndEnrichBrief } from './nue-motion/retrieval';
export type { RetrievalResult } from './nue-motion/types';
