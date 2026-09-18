import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

// If credentials are not provided in environment, provide safe null client
export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export interface UserProfile {
  id: string;
  email: string;
  creditBalance: number;
  createdAt: string;
}

export interface DbProject {
  id: string;
  userId: string;
  title: string;
  initialPrompt?: string;
  currentVersionIndex: number;
  versions: any[];
  createdAt: string;
  updatedAt: string;
}

export interface DbMemory {
  id: string;
  userId: string;
  category: string;
  preference: string;
  strength: 'high' | 'medium' | 'low';
  isActive: boolean;
  projectTitle?: string;
  createdAt: string;
  updatedAt: string;
}
