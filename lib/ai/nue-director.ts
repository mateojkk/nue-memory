/**
 * Nue Creative Director - LLM-powered creative brief generation
 *
 * Uses Groq (llama-3.3-70b-versatile) wrapped with withMemWal middleware:
 * - BEFORE each LLM call: auto-recalls user memories from Walrus
 * - AFTER each LLM call: auto-extracts and saves new preferences to Walrus
 */
import { generateText } from 'ai';
import { createGroq } from '@ai-sdk/groq';

const SYSTEM_PROMPT = `You are Nue, a creative director AI for short-form video production powered by Livepeer's decentralized AI media pipeline.

Given a user's creative request (and any recalled memory context about their preferences), produce a structured creative brief as valid JSON.

Available Livepeer video models:
- pixverse-t2v: Fast text-to-video, 3/5/8 second clips. Default for most requests.
- seedance-25-t2v: High-quality long-form text-to-video, 10-30 seconds. Use when user asks for longer videos (>8s).
- ltx-25-t2v-pro: Alternative text-to-video, 3-10 seconds.
- pixverse-i2v: Image-to-video animation. Use when user provides an image.
- seedance-25-i2v: High-quality image-to-video. Use when user provides an image and wants longer output.

Available post-processing:
- AI soundtrack generation (music action) with muxing (assemble)
- Subtitle burning via ffmpeg

Output ONLY valid JSON with these fields:
{
  "shouldGenerate": true | false,
  "enrichedPrompt": "detailed visual prompt for the video model, incorporating user preferences",
  "visualTheme": "the visual style/theme (e.g. 'Cinematic Monochrome', 'Cyberpunk Neon', 'Modern Product Showcase')",
  "pacing": "fast" | "moderate" | "cinematic",
  "audioStyle": "description of audio mood (e.g. 'Deep ambient atmospheric', 'Upbeat electronic')",
  "audioEnabled": true | false,
  "duration": number (seconds, pick the right duration for the request),
  "model": "pixverse-t2v" | "seedance-25-t2v" | "ltx-25-t2v-pro" (pick the best model),
  "aspectRatio": "16:9" | "9:16" | "1:1",
  "agentMessage": "a conversational response to the user"
}

Guidelines:
- CRITICAL: If the user says "hi", "hello", "hey", asks a general question, asks about starting a new chat, or is just chatting without asking to generate or edit a video, set "shouldGenerate": false. In agentMessage, reply warmly as Nue, their creative director, and answer their question directly.
- If the user describes a scene, asks to create a video, gives revision feedback, or attaches an image, set "shouldGenerate": true.
- Be truthful about video duration: single-shot video takes are 5-8 seconds (e.g. pixverse-t2v max 8s). If the user asks for longer (e.g. 15s-30s), explain that this is an 8-second take and subsequent takes can chain scenes together. Never claim in agentMessage to have generated a 30-second video for a single take.
- If the user asks for >8 seconds, use seedance-25-t2v
- If the user mentions TikTok, Reels, or vertical, use 9:16 aspect ratio
- Apply any recalled memory preferences naturally - don't fight them unless the user explicitly overrides
- When the user gives feedback on a previous version (provided as feedbackContext), adjust the brief accordingly
- Keep agentMessage natural, friendly, and user-focused. Do NOT lecture the user about technical backend details like Walrus, MemWal, or MCP.
- Do NOT use em dashes anywhere. Use standard hyphens only.`;

export interface DirectorResult {
  shouldGenerate: boolean;
  enrichedPrompt: string;
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
  const modelName = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';

  const isConversational = isConversationalMessage(userMessage) && !context.imageUrl && !context.feedbackContext;

  // If message is conversational, reply immediately without GPU generation or memory writes
  if (isConversational) {
    const { text } = await generateText({
      model: groq(modelName),
      system: `You are Nue, an expert creative director for AI video production.
The user is chatting with you, asking a question, or inquiring about studio features.
Respond warmly, conversationally, and directly in 1-3 sentences:
- If they ask about opening a new chat: confirm they can click the "New Chat" button in the header at any time to start a clean chat thread while keeping all previously generated video versions safely preserved.
- If they ask about video duration (e.g. 8s vs 30s): explain honestly that Livepeer single-shot models (like Pixverse) currently generate up to 8-second takes. Longer sequences can be produced by directing subsequent takes to chain scenes together.
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

  const { text } = await generateText({
    model: wrappedModel,
    system: SYSTEM_PROMPT,
    prompt: fullMessage,
  });

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

    return {
      shouldGenerate: shouldGen,
      enrichedPrompt: parsed.enrichedPrompt || parsed.prompt || text,
      visualTheme: parsed.visualTheme || 'Modern Product Showcase',
      pacing: ['fast', 'moderate', 'cinematic'].includes(parsed.pacing) ? parsed.pacing : 'moderate',
      audioStyle: parsed.audioStyle || 'Ambient modern electronic',
      audioEnabled: parsed.audioEnabled !== false,
      duration: typeof parsed.duration === 'number' ? Math.max(3, Math.min(30, parsed.duration)) : 5,
      model: parsed.model || 'pixverse-t2v',
      aspectRatio: ['16:9', '9:16', '1:1'].includes(parsed.aspectRatio) ? parsed.aspectRatio : '16:9',
      agentMessage: parsed.agentMessage || (shouldGen
        ? 'Directing your video with your preferred creative style.'
        : "Hello! I'm Nue, your creative director. What kind of video would you like to create today?"),
    };
  } catch {
    // If response was not valid JSON, treat as conversational reply - do NOT generate video
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
      agentMessage: text.trim() || "Hello! What kind of video would you like to create today?",
    };
  }
}
