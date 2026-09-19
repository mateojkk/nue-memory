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
- seedance-25-t2v: High-quality text-to-video takes (5-15s per take). Default model for all video generation.
- Multi-scene timeline assembly: Each take is rendered with a UNIQUE scene prompt, then assembled into a continuous video with synchronized soundtrack. Supports 15-60s total.
- pixverse-t2v: Fast alternative text-to-video model (3-8s per take, when explicitly requested or for quick previews).
- ltx-25-t2v-pro: Alternative text-to-video model (when explicitly requested).
- pixverse-i2v: Image-to-video animation. Use when user provides an image.

Available post-processing:
- AI soundtrack generation (music action) with seamless loop-fill muxing
- Multi-scene timeline sequencing and stitching (assemble)
- Subtitle burning via ffmpeg

Output ONLY valid JSON with these fields:
{
  "shouldGenerate": true | false,
  "enrichedPrompt": "detailed visual prompt for the overall video concept, incorporating user preferences",
  "scenePrompts": ["scene 1 visual prompt", "scene 2 visual prompt", ...] (REQUIRED when duration > 8. Each entry is a detailed visual prompt for one 8-second take. Generate enough scenes to fill the requested duration. Each scene should be visually distinct and advance the narrative.),
  "visualTheme": "the visual style/theme (e.g. 'Cinematic Monochrome', 'Cyberpunk Neon', 'Modern Product Showcase', 'Bright 3D Kids Animation')",
  "pacing": "fast" | "moderate" | "cinematic",
  "audioStyle": "description of audio mood (e.g. 'Deep ambient atmospheric', 'Upbeat electronic', 'Cheerful kids song')",
  "audioEnabled": true | false,
  "duration": number (seconds, e.g. 30, 45, or 60 if requested by user, or 5-8 for short takes),
  "model": "seedance-25-t2v" | "pixverse-t2v" | "ltx-25-t2v-pro",
  "aspectRatio": "16:9" | "9:16" | "1:1",
  "agentMessage": "a conversational response to the user"
}

Guidelines:
- CRITICAL: If the user says "hi", "hello", "hey", asks a general question, asks about starting a new chat, or is just chatting without asking to generate or edit a video, set "shouldGenerate": false. In agentMessage, reply warmly as Nue, their creative director, and answer their question directly.
- If the user describes a scene, asks to create a video, gives revision feedback, or attaches an image, set "shouldGenerate": true.
- Video duration and multi-scene sequences:
  * When the user requests 15-60 seconds (e.g. "make it 30 seconds", "1 minute video"): set duration to the requested number. Use model: "seedance-25-t2v" by default. Generate scenePrompts with enough unique scene descriptions (for seedance 15s takes: 30s -> 2 scenes, 45s -> 3 scenes, 60s -> 4 scenes). Each scene prompt must describe a DIFFERENT moment, angle, or action - NOT the same scene repeated. In agentMessage, enthusiastically confirm you are directing the full multi-scene video. Do NOT mention single-shot limits.
  * For standard single-scene requests without explicit duration, set duration: 10 or 15. Do NOT include scenePrompts.
- Each scenePrompt should be a complete visual description for that scene. Include the visual style, characters, action, camera angle, lighting, and mood. Make each scene flow naturally into the next to create a cohesive story.
- If the user mentions TikTok, Reels, or vertical, use 9:16 aspect ratio.
- Apply any recalled memory preferences naturally - don't fight them unless the user explicitly overrides.
- When the user gives feedback on a previous version (provided as feedbackContext), adjust the brief accordingly.
- Keep agentMessage natural, friendly, and user-focused. Do NOT lecture the user about technical backend details like Walrus, MemWal, or MCP.
- Do NOT use em dashes anywhere. Use standard hyphens only.`;

export interface DirectorResult {
  shouldGenerate: boolean;
  enrichedPrompt: string;
  scenePrompts?: string[];
  visualTheme: string;
  pacing: 'fast' | 'moderate' | 'cinematic';
  audioStyle: string;
  audioEnabled: boolean;
  duration: number;
  model: string;
  aspectRatio: '16:9' | '9:16' | '1:1';
  agentMessage: string;
}

interface DirectorContext {
  email: string;
  feedbackContext?: string;
  projectTitle?: string;
  imageUrl?: string;
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
- If they ask about video duration (e.g. 8s vs 30s): explain that Nue Motion sequences and stitches scenes into continuous 30-second video timelines with synchronized soundtracks using Livepeer assemble.
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
      duration: 5,
      model: 'pixverse-t2v',
      aspectRatio: '16:9',
      agentMessage: text.trim() || "Hey there! I'm Nue, your creative director. What kind of video or scene would you like to create today?",
    };
  }

  // Only autoSave to Walrus MemWal if user provided creative feedback or revision
  // Do NOT store casual conversation or greetings in memory
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

  // Build the user message with context
  let fullMessage = userMessage;
  if (context.feedbackContext) {
    fullMessage = `Previous prompt: "${userMessage}"\n\nUser feedback on the last version: "${context.feedbackContext}"\n\nRevise the creative brief based on this feedback.`;
  }
  if (context.imageUrl) {
    fullMessage += `\n\nThe user has provided an image for image-to-video animation. Use an i2v model (pixverse-i2v or seedance-25-i2v).`;
  }
  if (context.projectTitle) {
    fullMessage += `\n\nProject: "${context.projectTitle}"`;
  }

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
  const parsed = parseDirectorResponse(text, userMessage);

  // Flush any pending auto-save writes so they complete before the serverless
  // handler exits (withMemWal saves are fire-and-forget by default)
  if (typeof (wrappedModel as any).flush === 'function') {
    await (wrappedModel as any).flush();
  }

  return parsed;
}

/**
 * Parses the LLM's JSON response, with fallback defaults for robustness.
 */
function parseDirectorResponse(text: string, userMessage = ''): DirectorResult {
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

    const duration = typeof parsed.duration === 'number' ? Math.max(3, Math.min(60, parsed.duration)) : 5;

    // Extract scene prompts for multi-scene generation (duration > 8)
    let scenePrompts: string[] | undefined;
    if (Array.isArray(parsed.scenePrompts) && parsed.scenePrompts.length > 0) {
      scenePrompts = parsed.scenePrompts.filter((s: any) => typeof s === 'string' && s.trim().length > 0);
      if (scenePrompts!.length === 0) scenePrompts = undefined;
    }

    return {
      shouldGenerate: shouldGen,
      enrichedPrompt: parsed.enrichedPrompt || parsed.prompt || userMessage || text,
      scenePrompts,
      visualTheme: parsed.visualTheme || 'Modern Product Showcase',
      pacing: ['fast', 'moderate', 'cinematic'].includes(parsed.pacing) ? parsed.pacing : 'moderate',
      audioStyle: parsed.audioStyle || 'Ambient modern electronic',
      audioEnabled: parsed.audioEnabled !== false,
      duration,
      model: parsed.model || 'seedance-25-t2v',
      aspectRatio: ['16:9', '9:16', '1:1'].includes(parsed.aspectRatio) ? parsed.aspectRatio : '16:9',
      agentMessage: parsed.agentMessage || (shouldGen
        ? 'Directing your video with your preferred creative style.'
        : "Hello! I'm Nue, your creative director. What kind of video would you like to create today?"),
    };
  } catch (err) {
    console.warn('[nue-director] Could not parse JSON from director output:', err, text);
    // If user message is clearly not conversational, we MUST generate the video!
    const shouldGen = !isConversational;

    const durMatch = userMessage.match(/(\d+)\s*(?:seconds?|secs?|s)\b/i);
    const parsedDur = durMatch ? parseInt(durMatch[1], 10) : 5;
    const dur = Math.max(3, Math.min(60, parsedDur));
    const model = 'seedance-25-t2v';

    return {
      shouldGenerate: shouldGen,
      enrichedPrompt: userMessage,
      visualTheme: 'Creative Direction',
      pacing: 'moderate',
      audioStyle: 'Ambient modern electronic',
      audioEnabled: true,
      duration: dur,
      model,
      aspectRatio: '16:9',
      agentMessage: shouldGen
        ? 'Directing your video with your preferred creative style.'
        : "Hello! I'm Nue, your creative director. What kind of video would you like to create today?",
    };
  }
}
