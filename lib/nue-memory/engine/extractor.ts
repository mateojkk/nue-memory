import { StructuredMemory, MemoryType, MemoryScope } from '../core/types';

export interface ExtractionContext {
  userId?: string;
  domain?: string;
  projectId?: string;
  sessionContext?: string;
}

export interface ExtractedMemoryCandidate {
  type: MemoryType;
  category: string;
  value: string;
  confidence: number;
  scope: MemoryScope;
  domain: string;
  rationale: string;
  sourceText: string;
}

export interface MemoryExtractionResult {
  classification: 'temporary_edit' | 'persistent_memory' | 'mixed';
  confidence: number;
  reasoning: string;
  candidates: ExtractedMemoryCandidate[];
  temporaryInstructions: string[];
}

/**
 * Signals that indicate temporary, one-off instructions
 */
const TEMPORARY_MARKERS = [
  /\bthis (video|image|clip|draft|version|file|run|prompt|audio|scene|take)\b/i,
  /\bjust for (this|now|today)\b/i,
  /\bonly (in|for) this\b/i,
  /\bfor now\b/i,
  /\bat (0:\d\d|\d+ seconds?|frame \d+)\b/i,
  /\bmove (it|that|this) (slightly|a bit|2px|up|down|left|right)\b/i,
  /\bmake (it|this) (\d+|a few) (seconds?|px|percent) (shorter|longer|taller|wider)\b/i,
  /\bfix (the typo|the wording|that word)\b/i,
  /\btweak (just|only) the\b/i,
];

/**
 * Signals that indicate persistent, durable preferences and constraints
 */
const PERSISTENT_MARKERS = [
  /\balways\b/i,
  /\bnever\b/i,
  /\bfrom now on\b/i,
  /\bgoing forward\b/i,
  /\bin all (my|our|future)\b/i,
  /\bfor future (projects|runs|media|work|builds)\b/i,
  /\bi prefer\b/i,
  /\bi (really )?like\b/i,
  /\bi (really )?dislike\b/i,
  /\bi don't like\b/i,
  /\bwe prefer\b/i,
  /\bby default\b/i,
  /\busually\b/i,
  /\bnormally\b/i,
  /\bgenerally\b/i,
  /\bmy standard\b/i,
  /\bour brand\b/i,
  /\bconsistently\b/i,
  /\bmake sure to always\b/i,
];

/**
 * Semantic extraction rules for domain-agnostic and media preferences
 */
interface SemanticPattern {
  category: string;
  type: MemoryType;
  domain: string;
  pattern: RegExp;
  extract: (text: string, match: RegExpExecArray) => { value: string; confidence: number };
}

const SEMANTIC_PATTERNS: SemanticPattern[] = [
  // 1. Visual Style
  {
    category: 'visual_style',
    type: 'preference',
    domain: 'media',
    pattern: /(?:(?:prefer|like|want|use|aesthetic(?: is)?|switch(?:ed)? to)\s+([^,.;]+(?:minimal|bright|clean|cinematic|dark|light|cyberpunk|pastel|monochrome|vibrant|organic)[^,.;]*)|(?:(?:dark|light)\s+(?:mode|interfaces?|themes?)))/i,
    extract: (text) => {
      const lower = text.toLowerCase();
      if (lower.includes('dark')) {
        return {
          value: 'Prefers dark mode interfaces with deep black canvases',
          confidence: 0.94,
        };
      }
      if (lower.includes('light')) {
        return {
          value: 'Prefers light mode interfaces with warm white canvases',
          confidence: 0.94,
        };
      }
      if (lower.includes('bright') || lower.includes('minimal')) {
        return {
          value: 'Prefers bright, minimalist visual styling',
          confidence: 0.93,
        };
      }
      return {
        value: 'Prefers clean, modern cinematic visuals',
        confidence: 0.88,
      };
    },
  },
  // 2. Pacing / Tempo
  {
    category: 'pacing',
    type: 'preference',
    domain: 'media',
    pattern: /(?:(?:intro|pacing|cuts?)\s+.*(?:too slow|too fast|speed up|slow down|fast|brisk|smooth|cinematic|energetic|gentle)|(?:prefer|like|want|use|switch(?:ed)? to)\s+.*(?:fast|brisk|smooth|cinematic|energetic|gentle|slow)\s+(?:pacing|cuts?|intro)|pacing\s+(?:is too|should be|must be))/i,
    extract: (text) => {
      const lower = text.toLowerCase();
      if (lower.includes('too slow') || lower.includes('speed up') || lower.includes('fast') || lower.includes('energetic')) {
        return {
          value: 'Prefer fast, energetic introductions and brisk cut pacing',
          confidence: 0.94,
        };
      }
      return {
        value: 'Prefer smooth, steady cinematic pacing with gentle transitions',
        confidence: 0.90,
      };
    },
  },
  // 3. Captions / Typography
  {
    category: 'typography',
    type: 'preference',
    domain: 'media',
    pattern: /(?:(?:captions?|subtitles?|text on screen)\s+.*(?:larger|bigger|readable|small|subtle|remove|none)|(?:make|set)\s+(?:the\s+)?(?:captions?|subtitles?)\s+.*(?:larger|bigger|readable|small|subtle))/i,
    extract: (text) => {
      const lower = text.toLowerCase();
      if (lower.includes('larger') || lower.includes('large') || lower.includes('bigger') || lower.includes('readable')) {
        return {
          value: 'Prefer large, high-contrast, easily readable captions',
          confidence: 0.95,
        };
      }
      if (lower.includes('small') || lower.includes('subtle') || lower.includes('minimal')) {
        return {
          value: 'Prefer compact, subtle captions that do not obscure visuals',
          confidence: 0.91,
        };
      }
      if (lower.includes('remove') || lower.includes('none') || lower.includes('off') || lower.includes('no caption')) {
        return {
          value: 'Disable on-screen captions by default',
          confidence: 0.96,
        };
      }
      return {
        value: 'Use clear, synchronized typography for captions',
        confidence: 0.85,
      };
    },
  },
  // 4. Audio & Soundtrack
  {
    category: 'audio',
    type: 'preference',
    domain: 'media',
    pattern: /(?:(?:remove|avoid|no|don't like)\s+(?:the\s+)?(?:dramatic\s+)?(?:music|soundtrack|audio|strings)|(?:music|soundtrack|audio)\s*.*(?:avoid|remove|dramatic|upbeat|ambient|strings))/i,
    extract: (text) => {
      const lower = text.toLowerCase();
      if (lower.includes('remove') || lower.includes('avoid') || lower.includes('dramatic') || lower.includes("don't like") || lower.includes('no dramatic')) {
        return {
          value: 'Avoid dramatic cinematic strings; prefer subtle, modern ambient or rhythm beds',
          confidence: 0.93,
        };
      }
      if (lower.includes('upbeat') || lower.includes('energetic') || lower.includes('lo-fi')) {
        return {
          value: 'Prefer upbeat, modern rhythmic background tracks',
          confidence: 0.91,
        };
      }
      return {
        value: 'Use balanced, unobtrusive background music mixed behind dialogue',
        confidence: 0.86,
      };
    },
  },
  // 5. Layout & Aspect Ratio
  {
    category: 'layout',
    type: 'constraint',
    domain: 'media',
    pattern: /(?:format|aspect ratio|render in|dimensions?)\s*(?:as|to|is|in)?\s*(9:16|16:9|1:1|vertical|widescreen|portrait)/i,
    extract: (text, match) => {
      const val = match[1].toLowerCase();
      const ratio = val.includes('vertical') || val.includes('9:16') || val.includes('portrait') ? '9:16 vertical' : '16:9 widescreen';
      return {
        value: `Default video aspect ratio is ${ratio}`,
        confidence: 0.96,
      };
    },
  },
  // 6. Branding & Logo Placement
  {
    category: 'branding',
    type: 'constraint',
    domain: 'media',
    pattern: /(?:logo|brand watermark)\s+(?:should normally be|should be|must be|always in)\s+([^,.;]+)/i,
    extract: (text, match) => {
      return {
        value: `Logo positioning: ${match[1].trim()}`,
        confidence: 0.93,
      };
    },
  },
  // 7. General Developer & Workflow Preferences
  {
    category: 'workflow',
    type: 'preference',
    domain: 'general',
    pattern: /(?:prefer|always use|standard is)\s+([^,.;]+(?:typescript|tabs|spaces|dark mode|light mode|concise|detailed|python)[^,.;]*)/i,
    extract: (text, match) => {
      return {
        value: `Developer preference: ${match[1].trim()}`,
        confidence: 0.92,
      };
    },
  },
];

/**
 * Distinguishes temporary instructions from durable preferences and extracts structured candidates
 */
export function extractMemories(
  input: string,
  context: ExtractionContext = {}
): MemoryExtractionResult {
  const text = input.trim();
  const lower = text.toLowerCase();

  // 1. Evaluate signal indicators
  const temporarySignalsFound = TEMPORARY_MARKERS.filter((rx) => rx.test(lower));
  const persistentSignalsFound = PERSISTENT_MARKERS.filter((rx) => rx.test(lower));

  const hasExplicitTemporary = temporarySignalsFound.length > 0;
  const hasExplicitPersistent = persistentSignalsFound.length > 0;

  // 2. Extract semantic candidates
  const candidates: ExtractedMemoryCandidate[] = [];

  for (const rule of SEMANTIC_PATTERNS) {
    const match = rule.pattern.exec(text);
    if (match) {
      const extracted = rule.extract(text, match);

      // Adjust confidence based on persistent/temporary signals
      let confidence = extracted.confidence;
      if (hasExplicitPersistent) {
        confidence = Math.min(0.99, confidence + 0.05);
      } else if (hasExplicitTemporary) {
        // If framed temporarily ("make this video 5s shorter"), lower candidate confidence for global persistence
        confidence = Math.max(0.4, confidence - 0.35);
      }

      // Scope is global if explicit persistent signal or general domain; project if explicitly temporary
      const scope: MemoryScope = hasExplicitTemporary && !hasExplicitPersistent
        ? 'project'
        : 'global';

      candidates.push({
        type: rule.type,
        category: rule.category,
        value: extracted.value,
        confidence,
        scope,
        domain: context.domain || rule.domain,
        rationale: `Matched ${rule.category} pattern with ${hasExplicitPersistent ? 'explicit persistence signal' : 'standard inference'}.`,
        sourceText: text,
      });
    }
  }

  // 3. Classify overall turn
  const temporaryInstructions: string[] = [];
  if (hasExplicitTemporary) {
    temporaryInstructions.push(text);
  }

  let classification: MemoryExtractionResult['classification'] = 'temporary_edit';
  let reasoning = 'Input is specific to the current artifact revision.';

  if (candidates.length > 0 && hasExplicitPersistent) {
    classification = hasExplicitTemporary ? 'mixed' : 'persistent_memory';
    reasoning = `Identified ${candidates.length} durable preference(s) with explicit persistence markers.`;
  } else if (candidates.length > 0 && !hasExplicitTemporary) {
    // Implicit persistent preference candidate (e.g. "The intro is too slow. Make captions larger")
    classification = 'persistent_memory';
    reasoning = `Identified ${candidates.length} candidate preference(s) eligible for user confirmation.`;
  } else if (candidates.length > 0 && hasExplicitTemporary) {
    classification = 'mixed';
    reasoning = 'Contains temporary edits alongside candidate styling preferences.';
  }

  const overallConfidence = candidates.length > 0
    ? candidates.reduce((acc, c) => acc + c.confidence, 0) / candidates.length
    : 0.9;

  return {
    classification,
    confidence: overallConfidence,
    reasoning,
    candidates,
    temporaryInstructions,
  };
}

/**
 * Converts an ExtractedMemoryCandidate into a full StructuredMemory ready for storage
 */
export function candidateToStructuredMemory(
  candidate: ExtractedMemoryCandidate,
  context: ExtractionContext = {}
): StructuredMemory {
  const now = new Date().toISOString();
  const id = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  return {
    id,
    userId: context.userId || 'default_user',
    type: candidate.type,
    category: candidate.category,
    value: candidate.value,
    confidence: candidate.confidence,
    scope: candidate.scope,
    domain: candidate.domain,
    source: {
      type: 'user_feedback',
      eventContext: context.sessionContext || 'User interaction',
      projectId: context.projectId,
      timestamp: now,
    },
    createdAt: now,
    updatedAt: now,
    isActive: true,
  };
}
