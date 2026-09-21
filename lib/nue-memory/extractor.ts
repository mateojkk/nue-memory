/**
 * Extraction Layer Bridge
 * Core domain-agnostic extractor lives in ./engine/extractor.
 * Media-specific feedback classifier lives in ./media-memory/extractor.
 */

export { extractMemories } from './engine/extractor';
export { classifyFeedback, classifyFeedbackAuto } from './media-memory/extractor';
