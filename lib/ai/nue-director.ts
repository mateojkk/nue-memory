/**
 * Nue Creative Director - LLM-powered creative brief generation
 *
 * Uses Groq (llama-3.3-70b-versatile) wrapped with withMemWal middleware:
 * - BEFORE each LLM call: auto-recalls user memories from Walrus
 * - AFTER each LLM call: auto-extracts and saves new preferences to Walrus
 */
import { generateText } from 'ai';
import { createGroq } from '@ai-sdk/groq';

const SYSTEM_PROMPT = `You are Nue, a creative director AI for video production powered by Livepeer's decentralized AI media pipeline.

Given a user's creative request (and any recalled memory context about their preferences), produce a structured creative brief as valid JSON.

Available Livepeer video models and timeline assembly:
- seedance-25-t2v: High-fidelity cinematic video diffusion (flagship text-to-video model for all takes and multi-scene timelines up to 60s).
- seedance-25-i2v: High-fidelity image-to-video diffusion. Use whenever an image is provided.
- Multi-scene timeline assembly: Each take is rendered with a UNIQUE scene prompt, then assembled into a continuous video with synchronized soundtrack. Supports 15-60s total.
- ltx-25-t2v-pro: Alternative text-to-video model (when explicitly requested).

Available post-processing:
- AI soundtrack generation (music action) with seamless loop-fill muxing
- Multi-scene timeline sequencing and stitching (assemble)
- Subtitle burning via ffmpeg

Output ONLY valid JSON with these fields:
{
  "shouldGenerate": true | false,
  "enrichedPrompt": "detailed visual prompt for the overall video concept, strictly preserving all user-specified aesthetics, character details, actions, and settings",
  "scenePrompts": ["scene 1 visual prompt", "scene 2 visual prompt", ...] (REQUIRED when duration > 8. Generate enough scenes to fill the requested duration: 30s -> 2 scenes, 45s -> 3 scenes, 60s / 1 min -> 4 scenes. Each entry is a detailed visual prompt for one 15s take. Each scene MUST maintain visual continuity of characters and style while progressing the story),
  "visualTheme": "the visual style/theme honoring user's aesthetic (e.g. 'Cinematic Pastel Watercolor', 'Warm Golden Hour Animation', 'Dark Moody Film Noir')",
  "pacing": "fast" | "moderate" | "cinematic",
  "audioStyle": "description of audio mood and musical style",
  "audioEnabled": true | false,
  "lyricsPrompt": "[Verse 1]\nLine 1\nLine 2\n\n[Chorus]\nLine 3\nLine 4..." (REQUIRED if user provided lyrics or asked for singing/song. You MUST preserve the user's EXACT lyrics verbatim without changing or hallucinating words),
  "hasVocals": true | false (true if user asked for singing vocals, lyrics, song, or nursery rhyme),
  "duration": number (seconds: 60 for 1 minute, 45, 30, 15, or 5-15 for single takes),
  "model": "seedance-25-t2v" | "seedance-25-i2v",
  "aspectRatio": "16:9" | "9:16" | "1:1",
  "agentMessage": "a conversational response confirming the full video generation and duration"
}

Guidelines:
- CRITICAL DURATION RULES:
  * When user asks for 1 minute, 60s, or 1min: set duration: 60, model: "seedance-25-t2v", and provide 4 scenePrompts.
  * When user asks for 45 seconds: set duration: 45, model: "seedance-25-t2v", and provide 3 scenePrompts.
  * When user asks for 30 seconds: set duration: 30, model: "seedance-25-t2v", and provide 2 scenePrompts.
  * When user asks for quick takes or default: set duration: 15, model: "seedance-25-t2v".
- CRITICAL LYRICS RULES:
  * If the user provides lyrics anywhere in their message or conversation history, you MUST use their EXACT lyrics in lyricsPrompt. DO NOT make up new lyrics, DO NOT rewrite them, DO NOT leave out lines. Format with [Verse] / [Chorus] tags.
  * Ensure the lyrics structure covers the song duration so singing continues across the clip.
- CONVERSATION CONTINUITY & AESTHETIC FIDELITY:
  * In a multi-turn chat, you MUST retain the established visual style, characters, world, and theme from earlier messages. Never discard the visual aesthetics explained in previous prompts.
  * Do NOT replace the user's visual style with generic defaults.
- Only set shouldGenerate: false for purely conversational greetings ("hi", "hello") with no creative request.
- Keep agentMessage natural, friendly, and user-focused. Confirm the requested duration (e.g. "Directing your 60-second multi-scene video...").
- Do NOT use em dashes anywhere. Use standard hyphens only.`;

export interface DirectorResult {
  shouldGenerate: boolean;
  enrichedPrompt: string;
  scenePrompts?: string[];
  visualTheme: string;
  pacing: 'fast' | 'moderate' | 'cinematic';
  audioStyle: string;
  audioEnabled: boolean;
  lyricsPrompt?: string;
  hasVocals?: boolean;
  duration: number;
  model: string;
  aspectRatio: '16:9' | '9:16' | '1:1';
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
}

/**
 * Calls the Groq LLM (wrapped with withMemWal) to produce a structured creative brief.
 *
 * withMemWal automatically:
 * 1. Recalls relevant memories from Walrus before the LLM call
 * 2. Extracts and saves new user preferences after the LLM responds
 */
/**
 * Checks if the user message is a simple conversational greeting or query.
 */
export function isConversationalMessage(msg: string): boolean {
  const clean = msg.toLowerCase().trim();

  // Explicit meta questions or inquiries about the studio, chat, or features
  const metaQuestionPatterns = [
    /\b(cant i|can i|could i|how do i|how can i)\s+(open|start|create|have)?\s*(a\s+)?(new chat|new conversation)\b/i,
    /\b(why did|why is|why does|how come)\b.*\b(8|5|30|seconds?|secs?|short|duration|forget|forgot)\b/i,
    /\b(did you forget|you forgot|forgot it did|forgot what)\b/i,
    /\b(who are you|what are you|what can you do|what is this|tell me about yourself|help)\b/i,
    /\b(what video did you|what did you (just )?(make|do|generate))\b/i,
  ];

  if (metaQuestionPatterns.some((pattern) => pattern.test(clean))) {
    return true;
  }

  // Pure conversational greetings and acknowledgements
  const conversationalGreetings = [
    /^(hi|hello|hey|yo|sup|hiya|howdy|hola|greetings)\b/i,
    /^(good morning|good afternoon|good evening|good day|good night)\b/i,
    /^(how are you|how is it going|hows it going|whats up|what is up|whats new)\b/i,
    /^(thanks|thank you|thx|cool|awesome|great|ok|okay|nice|sounds good|got it|bye|goodbye)\b/i,
    /^(test|testing|ping|check)\b/i,
  ];

  if (conversationalGreetings.some((pattern) => pattern.test(clean))) {
    return true;
  }

  // If message contains explicit video creation command, it is NOT conversational
  const creationCommands = /\b(create|make|generate|render|animate|film|direct|produce)\s+(a|an|the|me)?\s*(video|clip|scene|take|animation|footage)\b/i;
  if (creationCommands.test(clean)) {
    return false;
  }

  // Short messages (<25 chars) without creation verbs
  const stripped = clean.replace(/['"!?.,]/g, '');
  if (stripped.length < 25 && !/\b(make|create|render|generate|build|animate|add|put|show|draw|video|clip|scene)\b/i.test(stripped)) {
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

  // 1. Explicit lyrics block: "lyrics:", "song:", "lyrics -", etc.
  const blockMatch = text.match(/(?:lyrics?|song|sing(?:ing)?|verse)\s*(?:are|is|words)?\s*[:\-]\s*([\s\S]+?)(?=(?:\n\s*\n[A-Z][a-zA-Z\s]+:|$))/i);
  if (blockMatch && blockMatch[1].trim().length > 10) {
    return formatLyrics(blockMatch[1].trim());
  }

  // 2. Quoted lyrics: "line 1 \n line 2..."
  const quoteMatches = Array.from(text.matchAll(/"([^"]{15,})"/g)).map(m => m[1].trim());
  if (quoteMatches.length > 0) {
    return formatLyrics(quoteMatches.join('\n'));
  }

  // 3. Multi-line stanza in prompt
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const lyricLines = lines.filter(l =>
    !/^(make|create|generate|direct|render|video|prompt|scene|duration|minute|seconds?|style|camera|please)/i.test(l) &&
    l.length > 6 && l.length < 120
  );
  if (lyricLines.length >= 2 && /\b(sing|song|lyrics?|rhyme|melody|cadence)\b/i.test(text)) {
    return formatLyrics(lyricLines.join('\n'));
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

function formatLyrics(raw: string): string {
  if (/\[(Verse|Chorus|Bridge|Outro)/i.test(raw)) {
    return raw;
  }
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length <= 4) {
    return `[Verse]\n${lines.join('\n')}`;
  }
  const v1 = lines.slice(0, 4);
  const ch = lines.slice(4, 8);
  const v2 = lines.slice(8);
  let out = `[Verse 1]\n${v1.join('\n')}`;
  if (ch.length > 0) out += `\n\n[Chorus]\n${ch.join('\n')}`;
  if (v2.length > 0) out += `\n\n[Verse 2]\n${v2.join('\n')}`;
  return out;
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

  const isConversational = isConversationalMessage(userMessage) && !context.imageUrl && !context.feedbackContext;

  // If message is conversational, reply immediately without GPU generation or memory writes
  if (isConversational) {
    const { text } = await generateText({
      model: groq(modelName),
      system: `You are Nue, an expert creative director for AI video production.
The user is chatting with you, asking a question, or inquiring about studio features.
Respond warmly, conversationally, and directly in 1-3 sentences:
- If they ask about opening a new chat: confirm they can click the "New Chat" button in the header at any time to start a clean chat thread while keeping all previously generated video versions safely preserved.
- If they ask about video duration (e.g. 8s vs 30s vs 60s): explain that Nue Motion sequences and stitches scenes into continuous 30-60 second video timelines with synchronized soundtracks using Livepeer assemble.
- If they ask what happened or why something was done: reassure them, explain clearly, and invite them to direct the next take or new scene.
Do NOT output JSON. Do NOT generate a video. Do NOT use em dashes anywhere. Use standard hyphens only.`,
      prompt: userMessage,
    });

    return {
      shouldGenerate: false,
      enrichedPrompt: userMessage,
      visualTheme: 'Modern Product Showcase',
      pacing: 'moderate',
      audioStyle: 'Ambient modern electronic',
      audioEnabled: false,
      duration: 15,
      model: 'seedance-25-t2v',
      aspectRatio: '16:9',
      agentMessage: text.trim() || "Hey there! I'm Nue, your creative director. What kind of video or scene would you like to create today?",
    };
  }

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
          .slice(0, 8)
          .map((m) => ({ category: m.category || 'visual_style', preference: m.preference }));
      }
    } catch (e) {
      console.warn('[nue-director] Walrus MemWal memory fetch notice:', e);
    }
  }

  // 2. Build fullMessage with conversation history and active memories
  let fullMessage = '';

  if (activeUserMemories.length > 0) {
    fullMessage += `=== ACTIVE USER CREATIVE MEMORIES (DECENTRALIZED WALRUS MEMWAL) ===\n`;
    for (const mem of activeUserMemories) {
      fullMessage += `- [${mem.category.toUpperCase()}]: ${mem.preference}\n`;
    }
    fullMessage += `MANDATORY: Honor and incorporate the user's active decentralized creative memories into the visual style, pacing, and audio mood unless the user explicitly overrides them.\n\n`;
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

  // Only autoSave to Walrus MemWal if user provided creative feedback or revision
  const shouldAutoSave = Boolean(
    context.feedbackContext ||
    /\b(prefer|always|never|my style|i like|i love|pacing|soundtrack|captions?|font|typography|palette|color|cinematic)\b/i.test(userMessage)
  );

  const wrappedModel = withMemWal(groq(modelName), {
    key: process.env.MEMWAL_PRIVATE_KEY,
    accountId: process.env.MEMWAL_ACCOUNT_ID,
    serverUrl: process.env.MEMWAL_SERVER_URL,
    namespace,
    maxMemories: 8,
    autoSave: shouldAutoSave,
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
  const parsed = parseDirectorResponse(text, userMessage, context);

  // Flush any pending auto-save writes so they complete before the serverless handler exits
  if (typeof (wrappedModel as any).flush === 'function') {
    await (wrappedModel as any).flush();
  }

  return parsed;
}

/**
 * Parses the LLM's JSON response, with fallback defaults for robustness.
 */
function parseDirectorResponse(text: string, userMessage = '', context?: DirectorContext): DirectorResult {
  const isConversational = isConversationalMessage(userMessage);

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
    const shouldGen = isConversational
      ? false
      : parsed.shouldGenerate !== undefined
      ? Boolean(parsed.shouldGenerate)
      : true;

    // Detect exact duration intent from message or history
    let duration = typeof parsed.duration === 'number' ? Math.max(3, Math.min(60, parsed.duration)) : 5;
    const isOneMin = /\b(?:1\s*min(?:ute)?|60\s*s(?:econds?)?)\b/i.test(userMessage) ||
      Boolean(context?.chatHistory && context.chatHistory.some(m => /\b(?:1\s*min(?:ute)?|60\s*s(?:econds?)?)\b/i.test(m.content)));
    if (isOneMin) {
      duration = 60;
    } else if (/\b(?:45\s*s(?:econds?)?)\b/i.test(userMessage)) {
      duration = 45;
    } else if (/\b(?:30\s*s(?:econds?)?)\b/i.test(userMessage)) {
      duration = 30;
    } else if (/\b(?:15\s*s(?:econds?)?)\b/i.test(userMessage)) {
      duration = 15;
    }

    // Target scene count for multi-scene pipeline
    const targetSceneCount = duration >= 46 ? 4 : duration >= 31 ? 3 : duration > 15 ? 2 : 1;
    let scenePrompts: string[] | undefined;
    if (targetSceneCount > 1) {
      const parsedScenes = Array.isArray(parsed.scenePrompts)
        ? parsed.scenePrompts.filter((s: any) => typeof s === 'string' && s.trim().length > 0)
        : [];
      const basePrompt = parsed.enrichedPrompt || parsed.prompt || userMessage;
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
      scenePrompts = parsedScenes.slice(0, targetSceneCount);
    }

    // Extract singing vocals and lyrics with strict user lyrics priority
    const userLyrics = extractUserLyrics(userMessage) || extractLyricsFromHistory(context?.chatHistory);
    const hasLyricsIntent = Boolean(userLyrics) || /\b(sing|singing|lyrics?|vocals?|vocal|song|rhyme|nursery rhyme|voice)\b/i.test(userMessage);
    const hasVocals = parsed.hasVocals !== undefined ? Boolean(parsed.hasVocals) : hasLyricsIntent;
    const lyricsPrompt = userLyrics || (typeof parsed.lyricsPrompt === 'string' && parsed.lyricsPrompt.trim() ? parsed.lyricsPrompt.trim() : undefined);

    const model = context?.imageUrl ? 'seedance-25-i2v' : 'seedance-25-t2v';

    return {
      shouldGenerate: shouldGen,
      enrichedPrompt: parsed.enrichedPrompt || parsed.prompt || userMessage || text,
      scenePrompts,
      visualTheme: parsed.visualTheme || 'Creative Direction',
      pacing: ['fast', 'moderate', 'cinematic'].includes(parsed.pacing) ? parsed.pacing : 'moderate',
      audioStyle: parsed.audioStyle || 'Ambient modern electronic',
      audioEnabled: parsed.audioEnabled !== false,
      lyricsPrompt,
      hasVocals,
      duration,
      model,
      aspectRatio: ['16:9', '9:16', '1:1'].includes(parsed.aspectRatio) ? parsed.aspectRatio : '16:9',
      agentMessage: parsed.agentMessage || (shouldGen
        ? `Directing your ${duration}s video with your preferred creative style.`
        : "Hello! I'm Nue, your creative director. What kind of video would you like to create today?"),
    };
  } catch (err) {
    console.warn('[nue-director] Could not parse JSON from director output:', err, text);
    const shouldGen = !isConversational;

    const isOneMin = /\b(?:1\s*min(?:ute)?|60\s*s(?:econds?)?)\b/i.test(userMessage);
    const durMatch = userMessage.match(/(\d+)\s*(?:seconds?|secs?|s)\b/i);
    const parsedDur = isOneMin ? 60 : durMatch ? parseInt(durMatch[1], 10) : 15;
    const dur = Math.max(5, Math.min(60, parsedDur));
    const model = context?.imageUrl ? 'seedance-25-i2v' : 'seedance-25-t2v';

    const targetSceneCount = dur >= 46 ? 4 : dur >= 31 ? 3 : dur > 15 ? 2 : 1;
    let scenePrompts: string[] | undefined;
    if (targetSceneCount > 1) {
      const stageTitles = [
        'Scene 1 Opening Take: Establishing setting and characters',
        'Scene 2 Narrative Progression: Dynamic interaction',
        'Scene 3 Climax: Peak visual motion and energy',
        'Scene 4 Finale: Closing resolution',
      ];
      scenePrompts = stageTitles.slice(0, targetSceneCount).map((title) => `${userMessage} (${title})`);
    }

    const userLyrics = extractUserLyrics(userMessage) || extractLyricsFromHistory(context?.chatHistory);
    const hasLyricsIntent = Boolean(userLyrics) || /\b(sing|singing|lyrics?|vocals?|vocal|song|rhyme|nursery rhyme|voice)\b/i.test(userMessage);

    return {
      shouldGenerate: shouldGen,
      enrichedPrompt: userMessage,
      scenePrompts,
      visualTheme: 'Creative Direction',
      pacing: 'moderate',
      audioStyle: hasLyricsIntent ? 'Cheerful melodic song' : 'Ambient modern electronic',
      audioEnabled: true,
      lyricsPrompt: userLyrics || undefined,
      hasVocals: hasLyricsIntent,
      duration: dur,
      model,
      aspectRatio: '16:9',
      agentMessage: shouldGen
        ? `Directing your ${dur}s video with your preferred creative style.`
        : "Hello! I'm Nue, your creative director. What kind of video would you like to create today?",
    };
  }
}
