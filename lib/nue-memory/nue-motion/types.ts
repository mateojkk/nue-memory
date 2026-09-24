import { StructuredMemory as CoreStructuredMemory } from '../core/types';

export type MemoryCategory =
  | 'visual_style'
  | 'pacing'
  | 'typography'
  | 'music'
  | 'audio'
  | 'voice'
  | 'captions'
  | 'color'
  | 'transitions'
  | 'length'
  | 'aspect_ratio'
  | 'layout'
  | 'duration'
  | 'model'
  | 'branding'
  | 'composition'
  | 'coding_style'
  | 'tool_preferences'
  | 'workflow_preferences';

export type PreferenceStrength = 'high' | 'medium' | 'low';
export type PreferenceScope = 'global' | 'project' | 'media' | 'coding' | 'general';

export interface MotionPreference {
  id: string;
  type: 'media_preference';
  category: MemoryCategory;
  preference: string;
  strength: PreferenceStrength;
  scope: PreferenceScope;
  source: 'user_feedback' | 'creative_brief' | 'manual_entry';
  createdAt: string;
  updatedAt: string;
  projectId?: string;
  projectTitle?: string;
  userId?: string;
  memwalBlobId?: string;
  supersedesId?: string; // If this memory updated/replaced an older one
  isActive: boolean;
}

export interface FeedbackClassification {
  type: 'temporary_edit' | 'persistent_preference';
  rationale: string;
  extractedPreferences: Omit<MotionPreference, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>[];
}

export interface StoryboardScene {
  sceneNumber: number;
  title: string;
  durationSeconds: number;
  prompt: string;
  mediaUrl?: string;
  url?: string;
  jobId?: string;
  model: string;
  characterAnchorUrl?: string;
}

export interface MediaVersion {
  versionNumber: number;
  createdAt: string;
  brief: string;
  enrichedBrief: string;
  appliedPreferences: MotionPreference[];
  mediaUrl: string;
  thumbnailUrl?: string;
  aspectRatio: '16:9' | '9:16' | '1:1';
  pacing: 'fast' | 'moderate' | 'cinematic';
  captionStyle: {
    enabled: boolean;
    size: 'small' | 'medium' | 'large';
    highlight: string;
    text: string;
  };
  audioStyle: {
    enabled: boolean;
    style: string;
    tempo: 'energetic' | 'ambient' | 'vocal' | 'speech' | 'none';
    audioUrl?: string;
    isMuxed?: boolean;
  };
  visualTheme: string;
  agentNotes: string;
  generationDurationSeconds: number;
  livepeerCapability?: string;
  /** Determinism seed used for this take; revisions reuse it for continuity. */
  seed?: number;
  /**
   * Deterministic outro: fade the separate soundtrack stem over this many
   * seconds. Set only from an approved fade rule; the player applies it via
   * WebAudio (muxed files can't be faded after the fact, so these takes ship
   * unmuxed on purpose).
   */
  fadeOutSeconds?: number;
  characterAnchorUrl?: string;
  scenes?: StoryboardScene[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent' | 'system';
  content: string;
  timestamp: string;
  versionNumber?: number;
  imageUrl?: string;
}

export interface CreativeProject {
  id: string;
  title: string;
  initialPrompt: string;
  createdAt: string;
  currentVersionIndex: number;
  versions: MediaVersion[];
  messages?: ChatMessage[];
}

export interface GenerateMediaRequest {
  brief: string;
  enrichedBrief: string;
  appliedPreferences: MotionPreference[];
  versionNumber: number;
  projectTitle: string;
  feedbackContext?: string;
  creativeDirectives?: RetrievalResult['creativeDirectives'];
  imageUrl?: string;
  scenePrompts?: string[];
  onProgress?: (progress: number, stage: string) => void;
}

export interface RetrievalResult {
  relevantMemories: MotionPreference[];
  enrichedBrief: string;
  creativeDirectives: {
    pacing?: 'fast' | 'moderate' | 'cinematic';
    captionSize?: 'small' | 'medium' | 'large';
    audioStyle?: string;
    aspectRatio?: '16:9' | '9:16' | '1:1';
    visualStyle?: string;
    duration?: number;
    model?: string;
  };
  summaryTokens: string[];
}
