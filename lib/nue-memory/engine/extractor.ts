import { StructuredMemory, MemoryType, MemoryScope } from '../core/types';

export interface ExtractionContext {
  userId?: string;
  domain?: string;
  projectId?: string;
  sessionContext?: string;
  /** Active memories for Mem0-style context-lookup dedupe. */
  existingMemories?: Array<{ category: string; value: string }>;
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
 * Durable creative-preference taxonomy. The LLM extractor must pick from
 * these categories so stored memories stay routable to render enrichment.
 */
export const MEMORY_CATEGORIES = [
  'pacing',
  'visual_style',
  'captions',
  'typography',
  'music',
  'voice',
  'color',
  'transitions',
  'length',
  'aspect_ratio',
  'branding',
  'composition',
] as const;

const EXTRACTION_SYSTEM_PROMPT = `You extract durable creative preferences from a single user message for an AI video studio. Return ONLY valid JSON, no prose, no code fences.

Schema:
{"classification": "persistent_memory" | "temporary_edit", "candidates": [{"category": "<one of: pacing, visual_style, captions, typography, music, voice, color, transitions, length, aspect_ratio, branding, composition>", "value": "<one crisp standing rule, e.g. 'Fade out soundtrack over the final 2 seconds rather than cutting abruptly'>", "confidence": 0.0 - 1.0}]}

Rules:
- Extract ONLY standing taste that should apply to future videos (likes, dislikes, always/never, from-now-on rules).
- One-off instructions about the current video ("fix this take", "move the logo up here") are temporary_edit with zero candidates.
- Each candidate value must be a reusable rule, never a quote of the current scene.
- Skip anything already stated in EXISTING MEMORIES (dedupe). If the message merely repeats a listed memory, return zero candidates.
- "audio"/"sound" maps to category "music". On-screen text maps to "captions". Speed/rhythm maps to "pacing".
- At most 4 candidates. Confidence above 0.9 only for explicit statements ("I like", "always", "from now on").`;

/**
 * Mem0-style extraction: a single LLM pass over the message with existing
 * memories as dedupe context (lookup -> extract -> dedupe in one call).
 * Throws when the LLM is unavailable - learning pauses honestly instead of
 * guessing.
 */
export async function extractMemories(
  input: string,
  context: ExtractionContext = {}
): Promise<MemoryExtractionResult> {
  const text = input.trim();
  if (!text) {
    return { classification: 'temporary_edit', confidence: 1, reasoning: 'Empty input.', candidates: [], temporaryInstructions: [] };
  }

  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not set: memory extraction requires the LLM.');
  }
  const { generateText } = await import('ai');
  const { createGroq } = await import('@ai-sdk/groq');
  const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
  const modelName = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

  const existingBlock =
    context.existingMemories && context.existingMemories.length > 0
      ? `EXISTING MEMORIES (do not re-extract these):\n${context.existingMemories
          .slice(0, 20)
          .map((m) => `- [${m.category}] ${m.value}`)
          .join('\n')}\n\n`
      : '';

  const { text: out } = await generateText({
    model: groq(modelName),
    system: EXTRACTION_SYSTEM_PROMPT,
    prompt: `${existingBlock}USER MESSAGE: "${text}"`,
  });

  const parsed = parseExtractionJson(out);
  if (!parsed) {
    throw new Error('Unparseable extractor output from the LLM.');
  }

  const candidates: ExtractedMemoryCandidate[] = [];
  for (const c of parsed.candidates.slice(0, 4)) {
    const category = String(c.category || '').toLowerCase();
    const value = String(c.value || '').trim();
    if (!MEMORY_CATEGORIES.includes(category as (typeof MEMORY_CATEGORIES)[number])) continue;
    if (value.length < 8) continue;
    const confidence = Math.max(0.4, Math.min(0.99, Number(c.confidence) || 0.8));
    candidates.push({
      type: 'preference',
      category,
      value: value.slice(0, 240),
      confidence,
      scope: 'domain',
      domain: context.domain || 'media',
      rationale: 'LLM-extracted standing preference with dedupe context.',
      sourceText: text,
    });
  }

  const classification: MemoryExtractionResult['classification'] =
    candidates.length > 0 ? 'persistent_memory' : 'temporary_edit';
  return {
    classification,
    confidence: candidates.length > 0 ? candidates.reduce((a, c) => a + c.confidence, 0) / candidates.length : 0.9,
    reasoning: `LLM extraction: ${candidates.length} durable preference(s).`,
    candidates,
    temporaryInstructions: candidates.length > 0 ? [] : [text],
  };
}

function parseExtractionJson(out: string): { classification: string; candidates: Array<{ category?: unknown; value?: unknown; confidence?: unknown }> } | null {
  try {
    let jsonStr = out.trim();
    const fenced = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) jsonStr = fenced[1].trim();
    else {
      const first = jsonStr.indexOf('{');
      const last = jsonStr.lastIndexOf('}');
      if (first !== -1 && last !== -1 && last > first) jsonStr = jsonStr.slice(first, last + 1);
    }
    const parsed = JSON.parse(jsonStr);
    if (!parsed || !Array.isArray(parsed.candidates)) return null;
    return parsed;
  } catch {
    return null;
  }
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
