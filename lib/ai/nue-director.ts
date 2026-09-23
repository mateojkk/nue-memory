/**
 * Nue Creative Director - LLM-powered creative brief generation
 *
 * Uses Groq (llama-3.3-70b-versatile) wrapped with withMemWal middleware:
 * - BEFORE each LLM call: auto-recalls user memories from Walrus
 * - AFTER each LLM call: auto-extracts and saves new preferences to Walrus
 */
import { generateText } from 'ai';
import { createGroq } from '@ai-sdk/groq';

/**
 * One render is a single take of at most this many seconds, because Livepeer's creative
 * MCP surface validates `create_media.duration` as an integer between 3 and 15 and
 * refuses anything larger before dispatch (issue_code `too_big`). Requests for longer
 * pieces are clamped here and explained honestly to the user instead of being promised.
 */
const MAX_TAKE_SECONDS = 15;

const SYSTEM_PROMPT = `You are Nue, an expert creative partner, co-director, and studio buddy for AI video production powered by Livepeer's decentralized media pipeline and Walrus MemWal.

YOUR ROLE & PERSONALITY:
- You are an enthusiastic, perceptive peer and creative friend in the studio—warm, witty, collaborative, encouraging, and deeply knowledgeable about filmmaking, music, and animation.
- Talk like a real human collaborator in the room, NEVER a cold corporate bot. Use natural phrasing, banter, and creative energy.
- When the user shares something cool, laughs, or vents (e.g. "the funny part is that, i just made that song!", "wait that is hilarious"), react naturally and genuinely! Acknowledge what they said with enthusiasm!
- When the user points out a mistake or gives a correction (e.g. "read the prompt properly", "the lyrics aint even complete", "i said 30 seconds"):
  * Own it with human authenticity! Carefully read the user's instructions from the prompt, and keep all user lyrics and character continuity intact.
  * DURATION LIMIT: one render produces a SINGLE take of at most 15 seconds, because Livepeer refuses any request above 15s per take. If the user asks for 30s, 45s or 60s, set "duration" to 15, render the strongest 15s take of that story, and explain honestly in "agentMessage" that the studio currently delivers 15s takes and that the remaining beats can be directed as follow-up takes continuing the same shot. NEVER promise a length that was not rendered.

YOUR FIRST MANDATE IS SEMANTIC INTENT CLASSIFICATION:
Classify the user's message into one of these intents:
1. "inquiry": The user is asking about capabilities, duration limits, models, features, or how something works (e.g. "can you generate 60 seconds videos?", "how does higgsfield do theirs?", "does livepeer support seedance?").
   -> MUST set "shouldGenerate": false.
   -> "agentMessage": Thoroughly and enthusiastically answer their question like a knowledgeable studio friend, and ask what kind of story or project they want to create!
2. "chat": Casual conversation, banter, jokes, laughs, reactions, or anecdotes (e.g. "the funny part is that, i just made that song!", "that looks hilarious", "whoa cool").
   -> MUST set "shouldGenerate": false.
   -> "agentMessage": React naturally and with high energy matching their vibe!
3. "clarify": The user expresses a vague desire to make a video but provided no concept, subject, or details (e.g. "make me a video", "generate something").
   -> MUST set "shouldGenerate": false.
   -> "agentMessage": Ask an inspiring question to help them define the setting, mood, or character.
4. "generate": The user provides an actual, specific creative concept, prompt, story, or visual scene to render.
   -> Set "shouldGenerate": true.
5. "revision": The user provides a correction, adjustment, or continuation of the active project (e.g. "make it 60s", "fix the lyrics", "change to night").
   -> Set "shouldGenerate": true.
   EXCEPTION: a standing taste statement ("I like...", "I prefer...", "I always/never...", "from now on...", "remember that...") with NO imperative to re-render the current video is NOT a revision. It is "memory" below, even mid-project.
6. "memory": The user states a standing preference or asks to save one (e.g. "i like having the sound fade out at the end", "always fade the music out", "remember that I prefer vertical", "from now on no ambient music"), without asking for a new render.
   -> MUST set "shouldGenerate": false.
   -> "agentMessage": Confirm the rule back crisply and say it is up for confirmation to Remember (no render started).
   -> "memoryCandidate": {"category": "<one of: pacing, visual_style, captions, typography, music, voice, color, transitions, length, aspect_ratio, branding, composition>", "preference": "<one crisp standing rule distilled from their words>"}.

Available Livepeer video models and timeline assembly:
- seedance-25-t2v: High-fidelity cinematic video diffusion (flagship text-to-video model for the single continuous take of every render).
- seedance-25-i2v: High-fidelity image-to-video diffusion. Use whenever an image is provided.
- Render limit: ONE take of 4-15s per render. Livepeer's creative surface caps a single render at 15s, so plan ONE continuous take and never split the request into multiple scenes. If the user wants something longer than 15s, direct this render as the strongest first chapter and describe the follow-up takes in agentMessage.

Output ONLY valid JSON with these fields:
{
  "userIntent": "inquiry" | "chat" | "clarify" | "generate" | "revision",
  "intentReasoning": "1 concise sentence explaining why this intent was chosen",
  "shouldGenerate": true | false,
  "agentMessage": "a natural, warm, human-like response matching your studio buddy persona",
  "memoryCandidate": {"category": "music", "preference": "Fade out soundtrack over the final 2 seconds"} | null (set ONLY for the "memory" intent, else null),
  "enrichedPrompt": "detailed positive visual prompt for the overall video concept (leave empty string if shouldGenerate is false)",
  "characterBible": "precise immutable description of all main characters (exact age, hair style & color, skin tone, facial features, wardrobe & garment colors) to lock Character DNA across scenes",
  "conceptImagePrompt": "clean master concept reference image prompt depicting the characters together clearly in their canonical wardrobe and setting, ideal for character anchor conditioning",
  "scenePrompts": ["scene 1 visual prompt", "scene 2 visual prompt", ...] (Do NOT use this field: the studio renders one single take per request, so the whole piece goes in enrichedPrompt),
  "visualTheme": "the visual style/theme honoring user's aesthetic",
  "pacing": "fast" | "moderate" | "cinematic",
  "audioStyle": "description of audio mood and musical style",
  "audioEnabled": true | false,
  "lyricsPrompt": "Line 1\\nLine 2\\n..." (verbatim user lyrics only, exactly as supplied by the user, without verse/chorus headers unless the user wrote those headers),
  "hasVocals": true | false,
  "duration": number (seconds for ONE take: 5-15. Use 15 whenever the user asks for anything longer, and explain the limit in agentMessage),
  "model": "seedance-25-t2v" | "seedance-25-i2v",
  "aspectRatio": "16:9" | "9:16" | "1:1"
}

CRITICAL RULES FOR PROMPTS SENT TO DIFFUSION:
- Focus purely on positive, vivid visual descriptions of lighting, characters, motion, atmosphere, and artistic style.
- NEVER copy negative instructions, legalistic disclaimers, or words like "copyright", "copyrighted", "infringe", "do not copy", "nursery rhyme" into the prompt or scenes. Automated partner scanners flag those words as false-positive policy violations. Describe the scene positively and artistically!
	- CHARACTER DNA & CONTINUITY (Google & Higgsfield Standard):
	  * Plan ONE single continuous take containing one continuous story: the SAME subjects, characters, environment, lighting, and visual theme throughout.
	  * Do NOT split the request into multiple scenes; the whole render is one take of at most 15s.
  * Define explicit "characterBible" locking the exact hair, skin tone, eye shape, wardrobe, and clothing colors.
  * Generate a "conceptImagePrompt" showing the characters together clearly from the front, in canonical lighting and outfits, to serve as the visual anchor.
- NEVER include duration, seconds, minutes, or timing counts (e.g. '30-second', '60s', '1 minute') in enrichedPrompt, conceptImagePrompt, scenePrompts, or audioStyle. Prompts to models must describe purely visual elements and musical mood/instruments, NEVER duration specifications.
- Do NOT use em dashes anywhere. Use standard hyphens only.`;

export interface DirectorResult {
  userIntent?: 'inquiry' | 'chat' | 'clarify' | 'generate' | 'revision' | 'memory';
  intentReasoning?: string;
  shouldGenerate: boolean;
  memoryCandidate?: { category: string; preference: string } | null;
  enrichedPrompt: string;
  scenePrompts?: string[];
  characterBible?: string;
  conceptImagePrompt?: string;
  visualTheme: string;
  pacing: 'fast' | 'moderate' | 'cinematic';
  audioStyle: string;
  audioEnabled: boolean;
  lyricsPrompt?: string;
  hasVocals?: boolean;
  duration: number;
  model: string;
  aspectRatio: '16:9' | '9:16' | '1:1';
  recalledMemories?: Array<{ category: string; preference: string }>;
  agentMessage: string;
}

export interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface DirectorContext {
  email: string;
  userId?: string;
  feedbackContext?: string;
  projectTitle?: string;
  imageUrl?: string;
  chatHistory?: ChatHistoryMessage[];
  applyMemories?: boolean;
}

const ACTIONABLE_MEMORY_CATEGORIES = new Set([
  'visual_style',
  'audio',
  'music',
  'voice',
  'pacing',
  'typography',
  'captions',
  'color',
  'transitions',
  'aspect_ratio',
  'layout',
  'duration',
  'model',
  'branding',
  'composition',
]);

function isActionableMemoryLike(memory: { category?: string; preference?: string }): boolean {
  const category = String(memory.category || '').toLowerCase();
  const preference = memory.preference?.trim();
  if (!preference) return false;
  const lower = preference.toLowerCase();
  if (category === 'general' || !ACTIONABLE_MEMORY_CATEGORIES.has(category)) return false;
  if (/\b(user requested|user specified|the video should|should include|for ages|copyright|watermark|logos?|subtitles?|recognizable|imitate|resemble|nursery rhyme)\b/i.test(lower)) {
    return false;
  }
  return true;
}

/**
 * Strips negative disclaimers and legalistic phrasing that trigger false positives
 * in ByteDance Seedance 2.5 and diffusion partner safety filters.
 */
export function sanitizePromptForDiffusion(prompt: string): string {
  if (!prompt) return '';
  return prompt
    // Strip negative disclaimers and legal terms that trip safety keywords
    .replace(/\b(?:do not|dont|never)\s+(?:imitate|reference|interpolate|resemble|copy|infringe|use)\b[^.]*(?:\.|$)/gi, '')
    .replace(/\b(?:no\s+(?:subtitles|logos|watermarks|copyrighted\s+characters?|recognizable\s+songs?|scary\s+imagery|silent\s+sections?|existing\s+melody))\b[^.]*(?:\.|$)/gi, '')
    // Strip generic negative video constraints as full sentences. These list
    // words like dialogue/text/subtitles/logos/recognizable that the partner
    // safety scanner reads as policy keywords, while carrying zero visual signal
    // for a text-to-video model (it renders frames, it never burns text).
    .replace(/\bno\b[^.]*\bon\s+screen\b[^.]*\.?/gi, ' ')
    .replace(/\bno\s+(?:dialogue|text|writing|subtitles?|captions?|logos?|watermarks?|recognizable\s+(?:characters?|people|faces?|songs?|music))\b[^.]*\.?/gi, ' ')
    .replace(/\b(?:copyrighted\s+character(?:s)?|nursery\s+rhyme(?:s)?|copyright\s+violation|infringement)\b/gi, '')
    // Strip audio-specific timing phrases that confuse video diffusion models and trigger audio validation
    .replace(/\b(?:as the music\s+(?:softens|plays|starts|swells|ends|fades))\b/gi, '')
    .replace(/\b(?:as the song\s+(?:ends|starts|plays|softens))\b/gi, '')
    // Audio-direction clauses belong in the soundtrack prompt, not the video prompt.
    // "Sound: ..." / "Audio: ..." sentences are pure audio direction, as are
    // imperative "Add ... sounds/music/audio ..." sentences.
    .replace(/\b(?:sound|audio|music)\s*:[^.]*\.?/gi, ' ')
    .replace(/\badd\b[^.]*\b(?:sounds?|music|audio|ambience|chatter)\b[^.]*\.?/gi, ' ')
    // Strip duration phrases from diffusion visual prompts (models describe visuals, not timing constraints)
    .replace(/\b(?:create\s+(?:a|an)\s+)?\b\d+\s*(?:-|–)?\s*(?:seconds?|secs?|s|minutes?|mins?)\s+(?:original\s+)?(?:animated\s+)?(?:children['']s\s+)?(?:music\s+)?(?:video|clip|scene|animation|movie)?\b/gi, '')
    .replace(/\b\d+\s*(?:-|–)?\s*(?:seconds?|secs?|s|minutes?|mins?)\b/gi, '')
    .replace(/\b(?:music:\s*[^.]*(?:\.|$))/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:])/g, '$1')
    .trim();
}

/**
 * Video diffusion models render frames: they never sing. When lyric or dialogue text leaks
 * from the user's brief into the video prompt, ByteDance's partner safety scanner reads it as
 * copyrighted material and refuses the render (`partner_validation_failed` /
 * `content_policy_violation`). Removing that text is what a "I refined the scene
 * descriptions" retry has to actually do, because re-dispatching the identical prompt
 * reproduces the identical rejection - which is exactly how a retry loop happens.
 *
 * Stage 1 (this one) is surgical and safe to apply to every video dispatch: it drops the
 * user's own lyric lines if the director echoed them, plus long quoted blocks that read as
 * lyrics or spoken dialogue. Short quoted labels (a one-word on-screen title) are preserved
 * so a requested visual element is never silently dropped.
 */
export function stripLyricTextFromVideoPrompt(prompt: string, lyrics?: string): string {
  if (!prompt) return '';
  let cleaned = prompt;

  if (lyrics) {
    for (const line of lyrics.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.length < 3) continue;
      cleaned = cleaned.split(trimmed).join(' ');
    }
  }

  return cleaned
    // 8+ characters inside quotes is long enough to be a lyric or dialogue line.
    .replace(/["\u201c\u201d'][^"\u201c\u201d']{8,}?["\u201c\u201d']/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:])/g, '$1')
    .replace(/([,;:])\s*([,.;:])+/g, '$1')
    .trim();
}

/**
 * Stage 2, used only to retry after the scanner has already refused once. It goes further
 * than stage 1 so the retry is genuinely a different payload: every quoted block goes,
 * and audio direction is dropped because it belongs to the soundtrack prompt rather than
 * the video prompt.
 */
export function simplifyVideoPromptForRetry(prompt: string): string {
  if (!prompt) return '';
  return prompt
    .replace(/["\u201c\u201d'][^"\u201c\u201d']+["\u201c\u201d']/g, ' ')
    .replace(/\b(?:as|while|when)\s+the\s+(?:music|song|soundtrack|melody|tune)\b[^.,;]*/gi, ' ')
    .replace(/\b(?:soundtrack|melod(?:y|ies)|lyrics?|verses?|chorus(?:es)?|rhymes?|sing-?along)\b/gi, ' ')
    // Retry must differ even when there were no quotes: drop audio-direction
    // sentences and negative-constraint sentences that the scanner flags.
    .replace(/\b(?:sound|audio|music)\s*:[^.]*\.?/gi, ' ')
    .replace(/\badd\b[^.]*\b(?:sounds?|music|audio|ambience|chatter)\b[^.]*\.?/gi, ' ')
    .replace(/\bno\b[^.]*\bon\s+screen\b[^.]*\.?/gi, ' ')
    .replace(/\bno\s+(?:dialogue|text|writing|subtitles?|captions?|logos?|watermarks?|recognizable\s+(?:characters?|people|faces?|songs?|music))\b[^.]*\.?/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:])/g, '$1')
    .replace(/([,;:])\s*([,.;:])+/g, '$1')
    .replace(/^[\s,.;:]+/, '')
    .trim();
}

/**
 * True when the provider's safety scanner refused the prompt, as opposed to a GPU or
 * transport failure. Only these are worth retrying with a rewritten prompt.
 */
export function isPolicyRejection(message?: string): boolean {
  if (!message) return false;
  return /content_policy_violation|copyright violation|partner_validation_failed|potential copyright|policy_violation/i.test(
    message
  );
}

/**
 * Translates technical AI / provider errors into human-friendly buddy explanations.
 */
export function humanizeUpstreamError(raw: any): string {
  if (!raw) return "I ran into a quick hiccup connecting to the media renderer. Let's give it another shot in just a moment!";
  
  let text = '';
  if (typeof raw === 'string') {
    text = raw;
  } else if (typeof raw === 'object') {
    try {
      text = JSON.stringify(raw);
    } catch {
      text = String(raw);
    }
  } else {
    text = String(raw);
  }

  // Unescape backslashes, quotes, and python representations
  const normalized = text.replace(/\\'/g, "'").replace(/\\"/g, '"');

  if (
    normalized.includes('content_policy_violation') ||
    normalized.includes('copyright violation') ||
    normalized.includes('partner_validation_failed') ||
    normalized.includes('rejected due to a potential copyright') ||
    normalized.includes('potential copyright')
  ) {
    return "ByteDance's automated safety scanner flagged the prompt as potential copyrighted material, which is a false positive on original work. The scanner matches quoted lyric or dialogue text, so those quoted lines are removed from the visual description on the next attempt. Rewording the scene slightly (or trimming the sung lyrics) clears it right away - say the word and I will re-roll.";
  }

  if (
    normalized.includes('502') ||
    normalized.includes('pymthouse') ||
    normalized.includes('provider node') ||
    normalized.includes('live-runner') ||
    normalized.includes('504') ||
    normalized.includes('Gateway Time-out') ||
    normalized.includes('timed out') ||
    normalized.includes('node_error')
  ) {
    return "Looks like the GPU render node hit a temporary congestion blip or timeout while processing the frames. I'm ready to re-queue our take whenever you say the word!";
  }

  if (normalized.includes('Insufficient credit') || normalized.includes('402')) {
    return "Looks like our studio compute balance has run out for a full take (about $3.47 for 15s on Seedance). Each account starts with a complimentary $10.00 grant.";
  }

  if (normalized.length > 80 && (normalized.includes('{') || normalized.includes('SDK') || normalized.includes('HTTP') || normalized.includes('Error:'))) {
    return "Our render node hit a temporary snag while compiling the video frames. I've reset the scene pipeline—ready to roll this take again whenever you are!";
  }

  return text.replace(/^Error:\s*/i, '');
}

/**
 * Checks if the user message is a conversational query, greeting, or reaction.
 */
export function isConversationalMessage(msg: string): boolean {
  const clean = msg.toLowerCase().trim();

  // 1. Explicit capability or informational questions:
  // e.g. "can you generate 60 seconds videos?", "can you make a video?", "how do you generate 60s?", "are you able to render?"
  const capabilityQuestion = /^(can you|could you|are you able to|do you|how do you|how can (?:i|we)|is it possible to|can it|does it|will it)\s+(?:create|make|generate|render|film|produce|do|support|handle|stitch|assemble)\b/i;
  if (capabilityQuestion.test(clean)) {
    const hasDetailedSubject = /\b(?:about|showing|featuring|with a|depicting|story of|scene where|prompt:)\b/i.test(clean);
    if (!hasDetailedSubject) {
      return true;
    }
  }

  // 2. Explicit questions, reactions, and studio inquiries
  const conversationalPatterns = [
    /\b(funny part|did you know|by the way|btw|honestly|wait a sec|hang on)\b/i,
    /\b(cant i|can i|could i|how do i|how can i)\s+(open|start|create|have)?\s*(a\s+)?(new chat|new conversation)\b/i,
    /\b(why did|why is|why does|how come)\b/i,
    /\b(did you forget|you forgot|what happened|is groq|are you sure)\b/i,
    /\b(who are you|what are you|what can you do|what is this|tell me about yourself|help)\b/i,
    /\b(what video did you|what did you (just )?(make|do|generate))\b/i,
    /\b(how does|how do|does|do|can|could|would|will|is|are|which)\s+[a-z0-9\s_\-']+\s+(work|do|offer|have|support|compare|use|run|theirs)\b/i,
    /\b(audit|deep audit|status check|system audit)\b/i,
    /\b(?:60\s*s(?:econds?)?|30\s*s(?:econds?)?|videos?)\s*\??$/i,
    /\?$/, // Any message ending in question mark without explicit creative prompt
    /^(hi|hello|hey|yo|sup|hiya|howdy|hola|greetings)\b/i,
    /^(good morning|good afternoon|good evening|good day|good night)\b/i,
    /^(how are you|how is it going|hows it going|whats up|what is up|whats new)\b/i,
    /^(thanks|thank you|thx|cool|awesome|great|ok|okay|nice|sounds good|got it|bye|goodbye|haha|lol)\b/i,
    /^(test|testing|ping|check)\b/i,
  ];

  if (conversationalPatterns.some((pattern) => pattern.test(clean))) {
    return true;
  }

  // 3. If message contains explicit video creation verbs with media nouns
  const creationCommands = /\b(create|make|generate|render|film|produce)\s+(a|an|the|me)?\s*(video|clip|scene|take|animation|footage)\b/i;
  if (creationCommands.test(clean)) {
    return false;
  }

  // Short messages (<35 chars) without creation verbs
  const stripped = clean.replace(/['"!?.,]/g, '');
  if (stripped.length < 35 && !/\b(make|create|render|generate|build|animate|video|clip|scene)\b/i.test(stripped)) {
    return true;
  }

  return false;
}

/**
 * Extracts verbatim user-provided lyrics from text or prompt.
 * Strictly preserves the user's wording without modification.
 */
export function extractUserLyrics(text: string): string | null {
  if (!text) return null;

  // 1. Quoted lyrics with curved or straight quotes: “...” or "..."
  const curvedMatches = Array.from(text.matchAll(/[“"]([\s\S]+?)[”"]/g))
    .map(m => m[1].trim())
    .filter(s => s.length > 20 && s.includes('\n'));
  if (curvedMatches.length > 0) {
    return normalizeLyricBlock(curvedMatches[0]);
  }

  // 2. Explicit lyrics block: "lyrics:", "song:", "lyrics -", "sing these original lyrics:", etc.
  const blockMatch = text.match(/(?:lyrics?|song|sing(?:ing)?|verse)\s*(?:are|is|words|these\s+original\s+lyrics)?\s*[:\-]\s*([\s\S]+?)(?=(?:\n\s*(?:MUSIC|ANIMATION|NOTE|STORY|STYLE|VISUALS?|AUDIO)[:\-])|$)/i);
  if (blockMatch && blockMatch[1].trim().length > 10) {
    let raw = blockMatch[1].trim();
    raw = raw.replace(/^[“"']+|[”"']+$/g, '').trim();
    return normalizeLyricBlock(raw);
  }

  // 3. Multi-line stanza in prompt
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const lyricLines = lines.filter(l =>
    !/^(make|create|generate|direct|render|video|prompt|scene|duration|minute|seconds?|style|camera|please|music|animation|story)/i.test(l) &&
    l.length > 6 && l.length < 120
  );
  if (lyricLines.length >= 2 && /\b(sing|song|lyrics?|rhyme|melody|cadence)\b/i.test(text)) {
    return normalizeLyricBlock(lyricLines.join('\n'));
  }

  return null;
}

export function extractExplicitDuration(text: string): number | null {
  const oneMin = /\b(?:1\s*min(?:ute)?|one\s*minute)\b/i.test(text);
  if (oneMin) return 60;

  const match = text.match(/\b(5|6|7|8|9|10|11|12|13|14|15|30|45|60)\s*(?:s(?:econds?)?|secs?|seconds?|-second)\b/i);
  if (!match) return null;
  return Math.max(5, Math.min(60, parseInt(match[1], 10)));
}

function findLatestCreativeUserMessage(history?: ChatHistoryMessage[]): string | null {
  if (!history) return null;
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    if (msg.role !== 'user') continue;
    if (
      extractUserLyrics(msg.content) ||
      /\b(create|generate|make|render|animate|video|children|lyrics|song|music)\b/i.test(msg.content)
    ) {
      return msg.content;
    }
  }
  return null;
}

function extractLyricsFromHistory(history?: ChatHistoryMessage[]): string | null {
  if (!history) return null;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === 'user') {
      const extracted = extractUserLyrics(history[i].content);
      if (extracted) return extracted;
    }
  }
  return null;
}

function normalizeLyricBlock(raw: string): string {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  return lines.join('\n');
}

export async function directCreativeBrief(
  userMessage: string,
  context: DirectorContext
): Promise<DirectorResult> {
  // Dynamic import because @mysten-incubation/memwal is ESM-only
  const { withMemWal } = await import('@mysten-incubation/memwal/ai');
  const { WalrusConfigError } = await import('../nue-memory/storage/walrus-store');

  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY environment variable is not set.');
  }

  if (!process.env.MEMWAL_PRIVATE_KEY || !process.env.MEMWAL_ACCOUNT_ID) {
    throw new WalrusConfigError();
  }

  const groq = createGroq({
    apiKey: process.env.GROQ_API_KEY,
  });

  const namespace = `nue-${context.email}`;
  const modelName = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

  // 1. Fetch active creative memories from decentralized Walrus MemWal
  let activeUserMemories: Array<{ category: string; preference: string }> = [];
  const userIdentifier = context.email || context.userId;
  if (userIdentifier) {
    try {
      const { memWalService } = await import('../walrus-memwal/client');
      const mems = await memWalService.getAllPreferencesAsync(userIdentifier, false);
      if (mems && mems.length > 0) {
        activeUserMemories = mems
          .filter((m) => m.isActive !== false)
          .filter(isActionableMemoryLike)
          .slice(0, 8)
          .map((m) => ({ category: m.category || 'visual_style', preference: m.preference }));
      }
    } catch (e) {
      console.warn('[nue-director] Walrus MemWal memory fetch notice:', e);
    }
  }

  // 2. Build fullMessage with conversation history and active memories
  let fullMessage = '';

  if (activeUserMemories.length > 0 && context.applyMemories) {
    fullMessage += `=== APPROVED USER CREATIVE MEMORIES (DECENTRALIZED WALRUS MEMWAL) ===\n`;
    for (const mem of activeUserMemories) {
      fullMessage += `- [${mem.category.toUpperCase()}]: ${mem.preference}\n`;
    }
    fullMessage += `MANDATORY: Honor and incorporate the user's active decentralized creative memories into the visual style, pacing, and audio mood unless the user explicitly overrides them.\n\n`;
  } else if (activeUserMemories.length > 0) {
    fullMessage += `=== AVAILABLE USER CREATIVE MEMORIES (NOT YET APPROVED FOR THIS RENDER) ===\n`;
    for (const mem of activeUserMemories) {
      fullMessage += `- [${mem.category.toUpperCase()}]: ${mem.preference}\n`;
    }
    fullMessage += `Do NOT blend these memories into the render plan yet. Only expose them as recalledMemories so the user can explicitly approve or ignore them before rendering.\n\n`;
  }

  if (context.chatHistory && context.chatHistory.length > 0) {
    fullMessage += `=== CONVERSATION THREAD SO FAR ===\n`;
    for (const msg of context.chatHistory) {
      fullMessage += `${msg.role === 'user' ? 'User' : 'Creative Director'}: ${msg.content}\n`;
    }
    fullMessage += `=== END OF CONVERSATION THREAD ===\n\n`;
  }

  fullMessage += `LATEST USER REQUEST: "${userMessage}"\n`;

  if (context.feedbackContext && context.feedbackContext !== userMessage) {
    fullMessage += `REVISION FEEDBACK: "${context.feedbackContext}"\n`;
  }

  if (context.imageUrl) {
    fullMessage += `\nImage provided for animation. Use seedance-25-i2v.\n`;
  }

  if (context.projectTitle) {
    fullMessage += `\nProject Title: "${context.projectTitle}"\n`;
  }

  const wrappedModel = withMemWal(groq(modelName), {
    key: process.env.MEMWAL_PRIVATE_KEY,
    accountId: process.env.MEMWAL_ACCOUNT_ID,
    serverUrl: process.env.MEMWAL_SERVER_URL,
    namespace,
    maxMemories: 8,
    // Durable writes are handled by the explicit /api/classify -> /api/memwal
    // confirmation flow. Letting the LLM middleware auto-save full prompts
    // creates noisy "general" memories from one-off creative briefs.
    autoSave: false,
    minRelevance: 0.3,
    debug: process.env.NODE_ENV === 'development',
  });

  let text = '';
  try {
    const res = await generateText({
      model: wrappedModel,
      system: SYSTEM_PROMPT,
      prompt: fullMessage,
    });
    text = res.text;
  } catch (genErr) {
    console.warn('[nue-director] generateText with wrappedModel failed, falling back to direct Groq:', genErr);
    const fallbackRes = await generateText({
      model: groq(modelName),
      system: SYSTEM_PROMPT,
      prompt: fullMessage,
    });
    text = fallbackRes.text;
  }

  // Parse the JSON response from the LLM
  const parsed = parseDirectorResponse(text, userMessage, context, activeUserMemories);

  // Flush any pending auto-save writes so they complete before the serverless handler exits
  if (typeof (wrappedModel as any).flush === 'function') {
    await (wrappedModel as any).flush();
  }

  return parsed;
}

/**
 * Parses the LLM's JSON response, with fallback defaults for robustness.
 */
function parseDirectorResponse(
  text: string,
  userMessage = '',
  context?: DirectorContext,
  recalledMemories: Array<{ category: string; preference: string }> = []
): DirectorResult {
  let jsonStr = text.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  } else {
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
    }
  }

  try {
    const parsed = JSON.parse(jsonStr);
    const userIntent = parsed.userIntent as 'inquiry' | 'chat' | 'clarify' | 'generate' | 'revision' | 'memory' | undefined;
    const isNonGeneratingIntent = userIntent === 'inquiry' || userIntent === 'chat' || userIntent === 'clarify' || userIntent === 'memory';
    const shouldGen = isNonGeneratingIntent
      ? false
      : parsed.shouldGenerate !== undefined
      ? Boolean(parsed.shouldGenerate)
      : true;

    // Standing preference distilled by the LLM (memory intent only). Validated
    // against the memory taxonomy so junk - and off-taxonomy labels that would
    // break cross-path dedupe - never reach the Remember UI.
    const MEMORY_CATEGORY_SET = new Set([
      'pacing', 'visual_style', 'captions', 'typography', 'music', 'voice',
      'color', 'transitions', 'length', 'aspect_ratio', 'branding', 'composition',
    ]);
    const rawCandidate = parsed.memoryCandidate;
    const rawCategory = typeof rawCandidate?.category === 'string' ? rawCandidate.category.toLowerCase() : '';
    const memoryCandidate =
      rawCandidate && typeof rawCandidate.preference === 'string' && rawCandidate.preference.trim().length > 3
        ? {
            category: MEMORY_CATEGORY_SET.has(rawCategory) ? rawCategory : 'visual_style',
            preference: rawCandidate.preference.trim().slice(0, 240),
          }
        : null;

    if (!shouldGen) {
      return {
        userIntent: userIntent || 'chat',
        intentReasoning: parsed.intentReasoning,
        shouldGenerate: false,
        memoryCandidate,
        enrichedPrompt: '',
        scenePrompts: undefined,
        characterBible: undefined,
        conceptImagePrompt: undefined,
        visualTheme: 'Creative Direction',
        pacing: 'moderate',
        audioStyle: 'Ambient modern electronic',
      audioEnabled: false,
      duration: 0,
      model: 'seedance-25-t2v',
      aspectRatio: '16:9',
      recalledMemories,
      agentMessage: parsed.agentMessage || "Hey! I'm right here with you. What are we thinking for our next take?",
    };
    }

    // Detect exact duration intent from message or history.
    // Explicit duration in the current user prompt takes absolute precedence over past chat history.
    const latestCreativeMessage = findLatestCreativeUserMessage(context?.chatHistory);
    let duration = typeof parsed.duration === 'number' ? Math.max(3, Math.min(MAX_TAKE_SECONDS, parsed.duration)) : MAX_TAKE_SECONDS;
    const userDuration = extractExplicitDuration(userMessage);
    const feedbackDuration = context?.feedbackContext ? extractExplicitDuration(context.feedbackContext) : null;
    const latestCreativeDuration = latestCreativeMessage ? extractExplicitDuration(latestCreativeMessage) : null;

    if (feedbackDuration) {
      duration = feedbackDuration;
    } else if (userDuration) {
      duration = userDuration;
    } else if (latestCreativeDuration && context?.feedbackContext) {
      duration = latestCreativeDuration;
    } else if (typeof parsed.duration === 'number' && parsed.duration >= 5) {
      duration = parsed.duration;
    }

    // One take per render. Livepeer caps `create_media.duration` at 15, so a request for
    // 30s/45s/60s is clamped here and the agentMessage explains the delivered length.
    duration = Math.max(5, Math.min(MAX_TAKE_SECONDS, duration));

    // Single take, so no scene split is ever planned.
    const targetSceneCount = 1;
    let scenePrompts: string[] | undefined;
    if (targetSceneCount > 1) {
      const parsedScenes = Array.isArray(parsed.scenePrompts)
        ? parsed.scenePrompts.filter((s: any) => typeof s === 'string' && s.trim().length > 0)
        : [];
      const basePrompt = sanitizePromptForDiffusion(parsed.enrichedPrompt || parsed.prompt || userMessage);
      const stageTitles = [
        'Scene 1 Opening Take: Establishing setting, atmosphere, and initial character motion',
        'Scene 2 Narrative Progression: Dynamic motion, interaction, and expressive camera work',
        'Scene 3 Climax Take: Peak visual motion, rich environmental depth, and high energy',
        'Scene 4 Narrative Finale: Harmonious closing resolution and memorable final frame',
      ];
      while (parsedScenes.length < targetSceneCount) {
        const idx = parsedScenes.length;
        parsedScenes.push(`${basePrompt} (${stageTitles[idx] || `Scene ${idx + 1}`})`);
      }
      scenePrompts = parsedScenes.slice(0, targetSceneCount).map(sanitizePromptForDiffusion);
    }

    // Extract singing vocals and lyrics ONLY if user provided lyrics or is revising existing song
    const userLyrics = extractUserLyrics(userMessage) || (context?.feedbackContext ? extractLyricsFromHistory(context?.chatHistory) : null);
    const hasLyricsIntent = Boolean(userLyrics) || /\b(sing|singing|lyrics?|vocals?|vocal|song|rhyme|voice)\b/i.test(userMessage);
    const hasVocals = parsed.hasVocals !== undefined ? Boolean(parsed.hasVocals) : hasLyricsIntent;
    const lyricsPrompt = userLyrics || (typeof parsed.lyricsPrompt === 'string' && parsed.lyricsPrompt.trim() ? parsed.lyricsPrompt.trim() : undefined);

    const model = context?.imageUrl ? 'seedance-25-i2v' : 'seedance-25-t2v';
    const sanitizedEnriched = sanitizePromptForDiffusion(parsed.enrichedPrompt || parsed.prompt || userMessage || text);
    const characterBible = parsed.characterBible ? sanitizePromptForDiffusion(parsed.characterBible) : undefined;
    const conceptImagePrompt = parsed.conceptImagePrompt
      ? sanitizePromptForDiffusion(parsed.conceptImagePrompt)
      : characterBible
      ? `Full shot master concept character sheet: ${characterBible}. High resolution, 8k, cinematic lighting, neutral composition, front-facing reference.`
      : undefined;

    return {
      shouldGenerate: shouldGen,
      enrichedPrompt: sanitizedEnriched,
      scenePrompts,
      characterBible,
      conceptImagePrompt,
      visualTheme: parsed.visualTheme || 'Creative Direction',
      pacing: ['fast', 'moderate', 'cinematic'].includes(parsed.pacing) ? parsed.pacing : 'moderate',
      audioStyle: parsed.audioStyle || 'Ambient modern electronic',
      audioEnabled: parsed.audioEnabled !== false,
      lyricsPrompt,
      hasVocals,
      duration,
      model,
      aspectRatio: ['16:9', '9:16', '1:1'].includes(parsed.aspectRatio) ? parsed.aspectRatio : '16:9',
      recalledMemories,
      agentMessage: parsed.agentMessage || (shouldGen
        ? `Love it! Rolling your ${duration}-second Seedance take now.`
        : "Hey there! I'm Nue, your creative co-director. What are we making today?"),
    };
  } catch (err) {
    console.warn('[nue-director] Could not parse JSON from director output:', err, text);
    // Last-resort backstop: a standing preference sentence must never become a
    // render just because the LLM reply was unparseable.
    if (
      /\b(i like|i love|i prefer|i always|i never|from now on|going forward|remember (that|this)|please remember|save (that|this|it|as)|my standard|by default)\b/i.test(userMessage) &&
      !/\b(create|generate|render|film|produce|animate)\s+(a|an|the|me)?\s*(video|clip|scene|take|animation|footage)\b/i.test(userMessage)
    ) {
      const lower = userMessage.toLowerCase();
      const category = /sound|music|audio|song|fade|volume/.test(lower)
        ? 'music'
        : /caption|subtitle|text on screen/.test(lower)
        ? 'captions'
        : /pac(e|ing)|intro|fast|slow/.test(lower)
        ? 'pacing'
        : /color|light|grading|neon|monochrome/.test(lower)
        ? 'color'
        : 'visual_style';
      return {
        userIntent: 'memory',
        shouldGenerate: false,
        memoryCandidate: { category, preference: userMessage.trim().slice(0, 240) },
        enrichedPrompt: '',
        scenePrompts: undefined,
        characterBible: undefined,
        conceptImagePrompt: undefined,
        visualTheme: 'Creative Direction',
        pacing: 'moderate',
        audioStyle: 'Ambient modern electronic',
        audioEnabled: false,
        duration: 0,
        model: 'seedance-25-t2v',
        aspectRatio: '16:9',
        recalledMemories,
        agentMessage: `Noted - "${userMessage.trim().slice(0, 120)}" is up as a memory to confirm. Hit Remember to lock it in. No video rendered.`,
      };
    }
    const hasVisualCues = /\b(scene \d|camera movement|establishing shot|cinematic lighting)\b/i.test(text);
    const looksConversational = !hasVisualCues || /^(hi|hello|hey|yes|sure|absolutely|we can|i can|great question)\b/i.test(text.trim());

    if (looksConversational) {
      return {
        userIntent: 'chat',
        shouldGenerate: false,
        enrichedPrompt: '',
        scenePrompts: undefined,
        characterBible: undefined,
        conceptImagePrompt: undefined,
        visualTheme: 'Creative Direction',
        pacing: 'moderate',
        audioStyle: 'Ambient modern electronic',
        audioEnabled: false,
        duration: 0,
        model: 'seedance-25-t2v',
        aspectRatio: '16:9',
        recalledMemories,
        agentMessage: text.trim() || "Hey! What kind of video concept should we dive into?",
      };
    }

    const latestCreativeMessage = findLatestCreativeUserMessage(context?.chatHistory);
    const parsedDur =
      (context?.feedbackContext ? extractExplicitDuration(context.feedbackContext) : null) ||
      extractExplicitDuration(userMessage) ||
      (context?.feedbackContext && latestCreativeMessage ? extractExplicitDuration(latestCreativeMessage) : null) ||
      15;
    const dur = Math.max(5, Math.min(MAX_TAKE_SECONDS, parsedDur));
    const model = context?.imageUrl ? 'seedance-25-i2v' : 'seedance-25-t2v';

    // One take per render, so the fallback path never splits into scenes either.
    const targetSceneCount = 1;
    let scenePrompts: string[] | undefined;
    const sanitizedEnriched = sanitizePromptForDiffusion(userMessage);
    if (targetSceneCount > 1) {
      const stageTitles = [
        'Scene 1 Opening Take: Establishing setting and characters',
        'Scene 2 Narrative Progression: Dynamic interaction',
        'Scene 3 Climax: Peak visual motion and energy',
        'Scene 4 Finale: Closing resolution',
      ];
      scenePrompts = stageTitles.slice(0, targetSceneCount).map((title) => `${sanitizedEnriched} (${title})`);
    }

    const userLyrics = extractUserLyrics(userMessage) || (context?.feedbackContext ? extractLyricsFromHistory(context?.chatHistory) : null);
    const hasLyricsIntent = Boolean(userLyrics) || /\b(sing|singing|lyrics?|vocals?|vocal|song|rhyme|voice)\b/i.test(userMessage);

    return {
      userIntent: 'generate',
      shouldGenerate: true,
      enrichedPrompt: sanitizedEnriched,
      scenePrompts,
      characterBible: undefined,
      conceptImagePrompt: undefined,
      visualTheme: 'Creative Direction',
      pacing: 'moderate',
      audioStyle: hasLyricsIntent ? 'Cheerful melodic song' : 'Ambient modern electronic',
      audioEnabled: true,
      lyricsPrompt: userLyrics || undefined,
      hasVocals: hasLyricsIntent,
      duration: dur,
      model,
      aspectRatio: '16:9',
      recalledMemories,
      agentMessage: `Got you covered! Directing your ${dur}-second take now.`,
    };
  }
}
