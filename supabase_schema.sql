-- Nue Memory & Motion Supabase Schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/dvdguraqnohapfnnmgyw/sql)

-- 1. Profiles Table (User identity and Livepeer compute balance)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    credit_balance NUMERIC(10, 2) DEFAULT 10.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Projects Table (Video projects in Nue Motion)
CREATE TABLE IF NOT EXISTS public.projects (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    initial_prompt TEXT,
    current_version_index INT DEFAULT 0,
    versions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Agent Memories Table (Learned creative rules synced with Walrus)
CREATE TABLE IF NOT EXISTS public.memories (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    category TEXT NOT NULL,
    preference TEXT NOT NULL,
    strength TEXT DEFAULT 'high',
    is_active BOOLEAN DEFAULT TRUE,
    project_title TEXT,
    supersedes_id TEXT,
    memwal_blob_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

-- Allow public access with Anon Key for Hackathon demo
CREATE POLICY "Public profiles access" ON public.profiles FOR ALL USING (true);
CREATE POLICY "Public projects access" ON public.projects FOR ALL USING (true);
CREATE POLICY "Public memories access" ON public.memories FOR ALL USING (true);
