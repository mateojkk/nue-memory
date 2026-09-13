import { FeedbackClassification, MediaPreference } from './types';
import { extractMemories as extractCoreMemories } from '../engine/extractor';

export { extractCoreMemories as extractMemories };

/**
 * Classifies feedback using the domain-agnostic Nue extraction engine,
 * returning formatted candidates for the Media Memory workflow.
 */
export function classifyFeedback(
  feedbackText: string,
  projectContext?: { projectTitle?: string; currentBrief?: string }
): FeedbackClassification {
  const result = extractCoreMemories(feedbackText, {
    domain: 'media',
    sessionContext: projectContext?.projectTitle,
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
  }));

  return {
    type: result.classification === 'temporary_edit' ? 'temporary_edit' : 'persistent_preference',
    rationale: result.reasoning,
    extractedPreferences,
  };
}
