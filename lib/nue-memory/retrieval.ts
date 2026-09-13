import { MediaPreference, MemoryCategory } from '../types';

export interface RetrievalResult {
  relevantMemories: MediaPreference[];
  enrichedBrief: string;
  creativeDirectives: {
    pacing?: 'fast' | 'moderate' | 'cinematic';
    captionSize?: 'small' | 'medium' | 'large';
    audioStyle?: string;
    aspectRatio?: '16:9' | '9:16' | '1:1';
    visualStyle?: string;
  };
  summaryTokens: string[];
}

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
        if (!lowerBrief.includes('no caption')) {
          isRelevant = true;
          creativeDirectives.captionSize = memory.preference.toLowerCase().includes('large') ? 'large' : 'medium';
          summaryTokens.push('Large captions');
        }
        break;

      case 'music':
        isRelevant = true;
        creativeDirectives.audioStyle = memory.preference;
        summaryTokens.push('Preferred music styling');
        break;

      case 'aspect_ratio':
        if (memory.preference.includes('9:16') || lowerBrief.includes('vertical') || lowerBrief.includes('tiktok') || lowerBrief.includes('reels')) {
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
      case 'typography':
      case 'composition':
        isRelevant = true;
        summaryTokens.push(memory.preference.slice(0, 30) + '...');
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
