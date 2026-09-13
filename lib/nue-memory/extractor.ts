import { FeedbackClassification, MediaPreference, MemoryCategory, PreferenceStrength } from '../types';

/**
 * Keyword and semantic rules for detecting creative preference categories
 */
interface CategoryRule {
  category: MemoryCategory;
  patterns: RegExp[];
  extractPreference: (text: string) => { preference: string; strength: PreferenceStrength } | null;
}

const CATEGORY_RULES: CategoryRule[] = [
  {
    category: 'pacing',
    patterns: [
      /intro/i,
      /pacing/i,
      /(?:cut|transitions?)\b.*(?:faster|slower|quick|smooth|cinematic)/i,
      /speed up|slow down/i,
      /first few seconds/i,
      /energetic|cinematic/i,
    ],
    extractPreference: (text) => {
      const lower = text.toLowerCase();
      if (lower.includes('too slow') || lower.includes('speed up') || lower.includes('fast intro') || lower.includes('energetic') || lower.includes('fast')) {
        return {
          preference: 'Use fast, energetic introductions and brisk pacing in the first 5 seconds',
          strength: 'high',
        };
      }
      if (lower.includes('too fast') || lower.includes('slow down') || lower.includes('cinematic') || lower.includes('smooth') || lower.includes('gentle') || lower.includes('calm')) {
        return {
          preference: 'Use smooth, steady cinematic pacing with gentle introductions',
          strength: 'high',
        };
      }
      return {
        preference: 'Maintain dynamic and intentional pacing tailored to viewer retention',
        strength: 'medium',
      };
    },
  },
  {
    category: 'captions',
    patterns: [
      /caption/i,
      /subtitles?/i,
      /text on screen/i,
      /readable/i,
      /font size/i,
    ],
    extractPreference: (text) => {
      const lower = text.toLowerCase();
      if (lower.includes('larger') || lower.includes('bigger') || lower.includes('too small') || lower.includes('readable') || lower.includes('large')) {
        return {
          preference: 'Use large, highly readable animated captions with high contrast',
          strength: 'high',
        };
      }
      if (lower.includes('smaller') || lower.includes('subtle') || lower.includes('minimal caption')) {
        return {
          preference: 'Use compact, subtle captions that do not distract from the footage',
          strength: 'medium',
        };
      }
      if (lower.includes('no caption') || lower.includes('remove caption')) {
        return {
          preference: 'Disable on-screen captions by default',
          strength: 'high',
        };
      }
      return {
        preference: 'Display bold, legible synchronized captions',
        strength: 'medium',
      };
    },
  },
  {
    category: 'music',
    patterns: [
      /music/i,
      /background track/i,
      /audio/i,
      /soundtrack/i,
      /sound design/i,
      /beat/i,
    ],
    extractPreference: (text) => {
      const lower = text.toLowerCase();
      if (lower.includes('remove') || lower.includes("don't like this music") || lower.includes('no dramatic') || lower.includes('annoying') || lower.includes('minimal')) {
        return {
          preference: 'Avoid dramatic cinematic background music; prefer subtle, modern ambient or rhythm beds',
          strength: 'high',
        };
      }
      if (lower.includes('upbeat') || lower.includes('energetic') || lower.includes('hyped') || lower.includes('punchy')) {
        return {
          preference: 'Feature upbeat, rhythmic modern electronic or Lo-Fi background tracks',
          strength: 'high',
        };
      }
      return {
        preference: 'Use balanced, unobtrusive background music mixed cleanly behind dialogue',
        strength: 'medium',
      };
    },
  },
  {
    category: 'aspect_ratio',
    patterns: [
      /vertical/i,
      /horizontal/i,
      /9:16/i,
      /16:9/i,
      /tiktok/i,
      /reels/i,
      /widescreen/i,
      /portrait/i,
    ],
    extractPreference: (text) => {
      const lower = text.toLowerCase();
      if (lower.includes('vertical') || lower.includes('9:16') || lower.includes('tiktok') || lower.includes('reels') || lower.includes('portrait')) {
        return {
          preference: 'Format media as 9:16 vertical video optimized for mobile platforms',
          strength: 'high',
        };
      }
      if (lower.includes('16:9') || lower.includes('horizontal') || lower.includes('widescreen') || lower.includes('landscape')) {
        return {
          preference: 'Format media as 16:9 widescreen landscape',
          strength: 'high',
        };
      }
      return null;
    },
  },
  {
    category: 'visual_style',
    patterns: [
      /style/i,
      /aesthetic/i,
      /vibe/i,
      /mood/i,
      /minimalist/i,
      /cyberpunk/i,
      /film grain/i,
      /clean/i,
    ],
    extractPreference: (text) => {
      const lower = text.toLowerCase();
      if (lower.includes('clean') || lower.includes('minimal')) {
        return {
          preference: 'Maintain a clean, modern aesthetic with high-key lighting and minimal clutter',
          strength: 'medium',
        };
      }
      if (lower.includes('cinematic') || lower.includes('film')) {
        return {
          preference: 'Emphasize cinematic lighting with shallow depth of field and color grading',
          strength: 'high',
        };
      }
      return null;
    },
  },
  {
    category: 'branding',
    patterns: [
      /logo/i,
      /watermark/i,
      /brand/i,
      /badge/i,
    ],
    extractPreference: (text) => {
      const lower = text.toLowerCase();
      if (lower.includes('top-right') || lower.includes('top right')) {
        return {
          preference: 'Always place brand logo in the top-right corner with subtle opacity',
          strength: 'high',
        };
      }
      return null;
    },
  },
];

/**
 * Classify whether user feedback is project-specific temporary edit or a persistent preference
 */
export function classifyFeedback(
  feedbackText: string,
  projectContext?: { projectTitle?: string; currentBrief?: string }
): FeedbackClassification {
  const text = feedbackText.trim();
  const lower = text.toLowerCase();

  // Explicit temporary edit markers
  const temporarySignals = [
    /\bthis video\b/i,
    /\bthis clip\b/i,
    /\bjust for now\b/i,
    /\bonly in this\b/i,
    /\bmove (the|that) .* slightly\b/i,
    /\bchange the wording at (0:0|second)\b/i,
  ];

  // Explicit persistent markers
  const persistentSignals = [
    /\balways\b/i,
    /\bnever\b/i,
    /\bfrom now on\b/i,
    /\banymore\b/i,
    /\bi prefer\b/i,
    /\bi like\b/i,
    /\bi want all my\b/i,
    /\bfor future\b/i,
    /\bgenerally\b/i,
    /\bmake captions (larger|bigger)\b/i,
    /\bintro is too (slow|fast)\b/i,
    /\bremove this style of\b/i,
  ];

  let hasTempSignal = temporarySignals.some((rx) => rx.test(lower));
  let hasPersistentSignal = persistentSignals.some((rx) => rx.test(lower));

  const extractedPreferences: Omit<MediaPreference, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>[] = [];

  for (const rule of CATEGORY_RULES) {
    const matchesPattern = rule.patterns.some((pattern) => pattern.test(lower));
    if (matchesPattern) {
      const extracted = rule.extractPreference(text);
      if (extracted) {
        extractedPreferences.push({
          type: 'media_preference',
          category: rule.category,
          preference: extracted.preference,
          strength: extracted.strength,
          scope: 'global',
          source: 'user_feedback',
          projectTitle: projectContext?.projectTitle,
        });
      }
    }
  }

  // If preferences were recognized and not explicitly marked temporary, classify as persistent preference candidate
  const isPersistent = (hasPersistentSignal || extractedPreferences.length > 0) && !hasTempSignal;

  return {
    type: isPersistent ? 'persistent_preference' : 'temporary_edit',
    rationale: isPersistent
      ? `Identified ${extractedPreferences.length} creative preference(s) suitable for cross-project memory.`
      : 'Feedback is specific to the current project revision.',
    extractedPreferences,
  };
}
