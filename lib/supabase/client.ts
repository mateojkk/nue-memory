import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// If credentials are not provided in environment, provide safe mock/null client
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
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
