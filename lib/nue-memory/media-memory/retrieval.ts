import { MediaPreference, RetrievalResult } from './types';

/**
 * Evaluates active memories against the creative brief to find relevant preferences
 * and builds the enriched context for Livepeer Agent.
 */
export function retrieveAndEnrichBrief(
  brief: string,
  memories: MediaPreference[]
): RetrievalResult {
  const activeMemories = memories.filter((m) => m.isActive);
  const relevantMemories: MediaPreference[] = [];
  const creativeDirectives: RetrievalResult['creativeDirectives'] = {};
  const summaryTokens: string[] = [];

  const lowerBrief = brief.toLowerCase();

  for (const memory of activeMemories) {
    let isRelevant = false;

    // Global preferences always apply unless explicitly negated in the brief
    if (memory.scope === 'global') {
      isRelevant = true;
    }

    // Check specific categories
    switch (memory.category) {
      case 'pacing':
        if (!lowerBrief.includes('slow intro') && !lowerBrief.includes('gentle intro')) {
          isRelevant = true;
          creativeDirectives.pacing = memory.preference.toLowerCase().includes('fast') ? 'fast' : 'cinematic';
          summaryTokens.push('Fast introductions');
        }
        break;

      case 'captions':
      case 'typography':
        if (!lowerBrief.includes('no caption')) {
          isRelevant = true;
          creativeDirectives.captionSize =
            memory.preference.toLowerCase().includes('large') ||
            memory.preference.toLowerCase().includes('readable') ||
            memory.preference.toLowerCase().includes('bigger')
              ? 'large'
              : 'medium';
          summaryTokens.push('Large captions');
        }
        break;

      case 'music':
      case 'audio':
        isRelevant = true;
        creativeDirectives.audioStyle = memory.preference;
        summaryTokens.push('Preferred audio styling');
        break;

      case 'aspect_ratio':
      case 'layout':
        if (
          memory.preference.includes('9:16') ||
          lowerBrief.includes('vertical') ||
          lowerBrief.includes('tiktok') ||
          lowerBrief.includes('reels')
        ) {
          isRelevant = true;
          creativeDirectives.aspectRatio = '9:16';
          summaryTokens.push('9:16 format');
        } else if (memory.preference.includes('16:9')) {
          isRelevant = true;
          creativeDirectives.aspectRatio = '16:9';
          summaryTokens.push('16:9 widescreen');
        }
        break;

      case 'visual_style':
      case 'branding':
      case 'composition':
        isRelevant = true;
        summaryTokens.push(memory.preference.slice(0, 30) + '...');
        break;

      case 'duration':
      case 'length':
        isRelevant = true;
        summaryTokens.push(memory.preference);
        break;
    }

    if (isRelevant && !relevantMemories.some((m) => m.id === memory.id)) {
      relevantMemories.push(memory);
    }
  }

  // Build the enriched brief string
  let enrichedBrief = brief.trim();

  if (relevantMemories.length > 0) {
    const memoryDirectives = relevantMemories
      .map((m) => `- [${m.category.toUpperCase()}]: ${m.preference}`)
      .join('\n');

    enrichedBrief = `${brief.trim()}

[Enriched by Nue Memory with persistent user preferences]:
${memoryDirectives}`;
  }

  return {
    relevantMemories,
    enrichedBrief,
    creativeDirectives,
    summaryTokens,
  };
}
