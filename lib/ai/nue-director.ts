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
- CRITICAL: If the user says "hi", "hello", "hey", asks a general question, or is just chatting without asking to generate or edit a video, set "shouldGenerate": false. In agentMessage, reply warmly as Nue, their creative director, and ask what kind of video or scene they would like to create.
- If the user describes a scene, asks to create a video, gives revision feedback, or attaches an image, set "shouldGenerate": true.
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

  const wrappedModel = withMemWal(groq(modelName), {
    key: process.env.MEMWAL_PRIVATE_KEY,
    accountId: process.env.MEMWAL_ACCOUNT_ID,
    serverUrl: process.env.MEMWAL_SERVER_URL,
    namespace,
    maxMemories: 8,
    autoSave: true,
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
 * Checks if the user message is a simple conversational greeting or query.
 */
function isGreetingMessage(msg: string): boolean {
  const clean = msg.toLowerCase().trim().replace(/[!.,?]/g, '');
  const greetings = ['hi', 'hello', 'hey', 'yo', 'sup', 'good morning', 'good evening', 'howdy', 'how are you', 'who are you', 'help', 'test'];
  return greetings.includes(clean) || (clean.length <= 4 && !clean.includes('vid'));
}

/**
 * Parses the LLM's JSON response, with fallback defaults for robustness.
 */
function parseDirectorResponse(text: string, userMessage = ''): DirectorResult {
  const isGreeting = isGreetingMessage(userMessage);

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
    const shouldGen = isGreeting
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
    return {
      shouldGenerate: !isGreeting,
      enrichedPrompt: text,
      visualTheme: 'Modern Product Showcase',
      pacing: 'moderate',
      audioStyle: 'Ambient modern electronic',
      audioEnabled: true,
      duration: 5,
      model: 'pixverse-t2v',
      aspectRatio: '16:9',
      agentMessage: isGreeting
        ? "Hello! I'm Nue, your creative director. What kind of video would you like to create today?"
        : (text.trim() || 'Directing your video with your preferred creative style.'),
    };
  }
}
