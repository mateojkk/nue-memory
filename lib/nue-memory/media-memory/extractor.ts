import { FeedbackClassification, MediaPreference } from './types';
import { extractMemories, extractMemoriesAuto } from '../engine/extractor';

export { extractMemories };

/**
 * Classifies feedback using the domain-agnostic Nue extraction engine,
 * returning formatted candidates for the Media Memory workflow.
 */
export function classifyFeedback(
  feedbackText: string,
  projectContext?: { projectTitle?: string; currentBrief?: string; userId?: string }
): FeedbackClassification {
  const result = extractMemories(feedbackText, {
    domain: 'media',
    sessionContext: projectContext?.projectTitle,
    userId: projectContext?.userId,
  });

  const extractedPreferences: Omit<
    MediaPreference,
    'id' | 'createdAt' | 'updatedAt' | 'isActive'
  >[] = result.candidates.map((c) => ({
    type: 'media_preference',
    category: c.category as any,
    preference: c.value,
    strength: c.confidence >= 0.9 ? 'high' : c.confidence >= 0.8 ? 'medium' : 'low',
    scope: c.scope === 'domain' ? 'media' : c.scope === 'session' ? 'project' : c.scope,
    source: 'user_feedback',
    projectTitle: projectContext?.projectTitle,
    userId: projectContext?.userId,
  }));

  return {
    type: result.classification === 'temporary_edit' ? 'temporary_edit' : 'persistent_preference',
    rationale: result.reasoning,
    extractedPreferences,
  };
}

export interface AutoClassifyContext {
  projectTitle?: string;
  currentBrief?: string;
  userId?: string;
  /** Active memories for dedupe context (Mem0-style lookup before extract). */
  existingMemories?: Array<{ category: string; preference: string }>;
}

/**
 * Mem0-style classification: LLM extraction with existing memories as dedupe
 * context. Same output shape as classifyFeedback; falls back to rules.
 */
export async function classifyFeedbackAuto(
  feedbackText: string,
  projectContext?: AutoClassifyContext
): Promise<FeedbackClassification> {
  const result = await extractMemoriesAuto(feedbackText, {
    domain: 'media',
    sessionContext: projectContext?.projectTitle,
    userId: projectContext?.userId,
    existingMemories: (projectContext?.existingMemories || []).map((m) => ({
      category: m.category,
      value: m.preference,
    })),
  });

  const extractedPreferences: Omit<
    MediaPreference,
    'id' | 'createdAt' | 'updatedAt' | 'isActive'
  >[] = result.candidates.map((c) => ({
    type: 'media_preference',
    category: c.category as any,
    preference: c.value,
    strength: c.confidence >= 0.9 ? 'high' : c.confidence >= 0.8 ? 'medium' : 'low',
    scope: c.scope === 'domain' ? 'media' : c.scope === 'session' ? 'project' : c.scope,
    source: 'user_feedback',
    projectTitle: projectContext?.projectTitle,
    userId: projectContext?.userId,
  }));

  return {
    type: result.classification === 'temporary_edit' ? 'temporary_edit' : 'persistent_preference',
    rationale: result.reasoning,
    extractedPreferences,
  };
}
