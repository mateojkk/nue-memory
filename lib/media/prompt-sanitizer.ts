/**
 * Sanitizes visual prompts for video diffusion models (Seedance / LTX).
 * 
 * Video models generate visual frames only. Quoting song lyrics or dialogue
 * inside video prompts triggers automated copyright filters on partner nodes
 * (such as ByteDance Seedance partner validation failed: content_policy_violation).
 * 
 * This utility strips quoted lyrics, spoken dialogue, timing labels, and audio cues
 * so that video diffusion models receive purely visual, cinematic descriptions.
 */

export function sanitizeVisualPromptForVideo(rawPrompt: string): string {
  if (!rawPrompt || typeof rawPrompt !== 'string') {
    return 'Vibrant cinematic scene with expressive character motion and beautiful lighting';
  }

  let cleaned = rawPrompt;

  // 1. Remove em dashes and non-breaking hyphens
  cleaned = cleaned.replace(/[\u2014\u2013\u2011]/g, '-');

  // 2. Remove scene timestamp labels like "Scene 4 (45-60s):" or "Scene 1 Opening Take:"
  cleaned = cleaned.replace(/^Scene\s*\d+\s*(?:\([^)]*\))?\s*:\s*/gi, '');
  cleaned = cleaned.replace(/Scene\s*\d+\s*(?:Opening|Development|Climax|Finale|Narrative|Take)[^:]*:\s*/gi, '');
  cleaned = cleaned.replace(/\(\s*Scene\s*\d+[^)]*\)/gi, '');
  cleaned = cleaned.replace(/\(\s*\d+\s*[-‑]\s*\d+\s*s(?:econds?)?\s*\)/gi, '');

  // 3. Remove lyrics metadata markers and completion statements
  cleaned = cleaned.replace(/\bcompleting the \d+[-‑]second (?:nursery rhyme|video|song)\.?/gi, '');
  cleaned = cleaned.replace(/\bfor the \d+[-‑]second (?:nursery rhyme|video|song)\.?/gi, '');

  // 4. Replace verbs with quoted dialogue/lyrics into pure physical actions
  cleaned = cleaned.replace(/\b(?:clapping|clap)\s+["“][^"”]+["”]/gi, 'clapping hands in rhythm');
  cleaned = cleaned.replace(/\bsing(?:ing)?(?:\s+(?:the\s+)?(?:remaining\s+)?(?:verses?|lyrics?|words?|song))?\s*[,:]?\s*["“][^"”]+["”]/gi, 'dancing happily in rhythm');
  cleaned = cleaned.replace(/\bshouting\s+["“][^"”]+["”]/gi, 'cheering happily');
  cleaned = cleaned.replace(/\bsaying\s+["“][^"”]+["”]/gi, 'smiling warmly');

  // 5. Strip any remaining quoted strings (lyrics, dialogue, spoken words)
  cleaned = cleaned.replace(/["“][^"”]{4,}["”]/g, '');
  cleaned = cleaned.replace(/"[^"]*"/g, '');
  cleaned = cleaned.replace(/“[^”]*”/g, '');

  // 6. Remove explicit audio / instrumental instructions meant for sound models
  cleaned = cleaned.replace(/\bas the music (?:ends|plays|stops|fades|builds)[^,.]*[,.]?/gi, '');
  cleaned = cleaned.replace(/\bwith (?:a )?(?:gentle|upbeat|melodic|soft)?\s*(?:ukulele|guitar|piano|synth|beat|strum|melody|duck quack)[^,.]*[,.]?/gi, '');
  cleaned = cleaned.replace(/\bmusic ends with[^,.]*[,.]?/gi, '');

  // 7. Clean up redundant phrasing like "and then and then" or leftover connector words
  cleaned = cleaned.replace(/\band then\s+and then\b/gi, 'and then');
  cleaned = cleaned.replace(/\band then\s+(?=[A-Z])/g, '. ');
  cleaned = cleaned.replace(/\bthey sing the remaining verses\b/gi, 'they dance and play together');
  cleaned = cleaned.replace(/\bthey sing\b/gi, 'they celebrate');

  // 8. Normalize spacing and punctuation while preserving aspect ratios like 16:9, 9:16
  cleaned = cleaned.replace(/\s+/g, ' ');
  cleaned = cleaned.replace(/(\d+)\s*:\s*(\d+)/g, '$1:$2');
  cleaned = cleaned.replace(/\s*([,.;])\s*/g, '$1 ');
  cleaned = cleaned.replace(/([,.;])\s*\1+/g, '$1');
  cleaned = cleaned.replace(/\.\s*\./g, '.');
  cleaned = cleaned.replace(/\s*,\s*\./g, '.');
  cleaned = cleaned.trim();

  // If prompt was completely stripped down, provide a reliable aesthetic fallback
  if (cleaned.length < 15) {
    return 'Lively cartoon characters happily dancing, playing, and celebrating together in a sunlit meadow with colorful butterflies and warm golden lighting';
  }

  return cleaned;
}

/**
 * Extracts a clean, human-readable error message from raw provider strings
 * such as Python dictionaries, partner validation rejections, or HTTP 502s.
 */
export function extractFriendlyErrorMessage(rawError?: string): string {
  if (!rawError || typeof rawError !== 'string') {
    return 'Video generation encountered a temporary provider issue. Please try again.';
  }

  // 1. Check for copyright or policy violation mentions
  if (/copyright|content_policy_violation/i.test(rawError)) {
    return 'The generation was rejected by the provider due to potential copyright in quoted lyrics or prompt text. Prompts are now automatically sanitized to pure visual descriptions.';
  }

  // 2. Extract nested 'msg': '...' from partner error payloads
  const msgMatch = rawError.match(/['"]msg['"]\s*:\s*['"]([^'"]+)['"]/);
  if (msgMatch && msgMatch[1] && msgMatch[1].length > 10) {
    return msgMatch[1];
  }

  // 3. Check for partner validation failures
  if (/partner_validation_failed/i.test(rawError)) {
    return 'The video generation node rejected the request validation. Retrying with a simplified visual prompt.';
  }

  // 4. Check for node or HTTP 502 errors
  if (/HTTP 502|node_error|dispatch returned no result/i.test(rawError)) {
    return 'Livepeer GPU provider node was temporarily unreachable. Automatic fallback initiated.';
  }

  // 5. Trim overly long raw strings
  if (rawError.length > 200) {
    return `${rawError.slice(0, 197)}...`;
  }

  return rawError;
}
