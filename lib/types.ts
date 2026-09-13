export type MemoryCategory =
  | 'visual_style'
  | 'pacing'
  | 'typography'
  | 'music'
  | 'voice'
  | 'captions'
  | 'color'
  | 'transitions'
  | 'length'
  | 'aspect_ratio'
  | 'duration'
  | 'branding'
  | 'composition'
  | 'coding_style'
  | 'tool_preferences'
  | 'workflow_preferences';

export type PreferenceStrength = 'high' | 'medium' | 'low';
export type PreferenceScope = 'global' | 'project' | 'media' | 'coding' | 'general';

export interface StructuredMemory {
  id: string;
  type: 'preference' | 'rule' | 'fact' | 'pattern';
  category: string;
  value: string;
  strength: PreferenceStrength;
  confidence: number;
  source: 'user_feedback' | 'creative_brief' | 'manual_entry' | 'system_inference';
  scope: PreferenceScope;
  createdAt: string;
  updatedAt: string;
  sourceEvent?: string; // e.g., "User feedback on Product Promo v1"
  usedInProjects?: string[]; // e.g., ["Launch Video v2"]
  supersededById?: string;
  supersedesId?: string;
  isActive: boolean;
  memwalBlobId?: string;
  userId?: string;
}

export interface MediaPreference {
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
  memwalBlobId?: string;
  supersedesId?: string; // If this memory updated/replaced an older one
  isActive: boolean;
}

export interface FeedbackClassification {
  type: 'temporary_edit' | 'persistent_preference';
  rationale: string;
  extractedPreferences: Omit<MediaPreference, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>[];
}

export interface MediaVersion {
  versionNumber: number;
  createdAt: string;
  brief: string;
  enrichedBrief: string;
  appliedPreferences: MediaPreference[];
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
    tempo: 'energetic' | 'ambient' | 'none';
  };
  visualTheme: string;
  agentNotes: string;
  generationDurationSeconds: number;
  livepeerCapability?: string;
}

export interface CreativeProject {
  id: string;
  title: string;
  initialPrompt: string;
  createdAt: string;
  currentVersionIndex: number;
  versions: MediaVersion[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent' | 'system';
  content: string;
  timestamp: string;
  detectedPreferences?: MediaPreference[];
  versionNumber?: number;
  isEnrichedBriefView?: boolean;
}
