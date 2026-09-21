/**
 * Extraction Layer Bridge
 * Core domain-agnostic extractor lives in ./engine/extractor.
 * Media-specific feedback classifier lives in ./nue-motion/extractor.
 */

export { extractMemories } from './engine/extractor';
export { classifyFeedbackAuto } from './nue-motion/extractor';
