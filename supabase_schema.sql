-- Nue Memory & Motion Supabase Schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/dvdguraqnohapfnnmgyw/sql)

-- 1. Profiles Table (User identity and Livepeer compute balance)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    credit_balance NUMERIC(10, 2) DEFAULT 10.00,
    -- Sealed (AES-256-GCM) user-supplied Livepeer key. NEVER plaintext:
    -- profiles rows are readable with the public anon key.
    livepeer_api_key TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration for existing deployments (run once in the SQL editor):
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS livepeer_api_key TEXT;

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

-- 4. Pending Renders Table (durable in-flight render descriptors)
-- Lets a render started on one device finish into the gallery from any other
-- device hours later: everything GET needs to poll Livepeer to completion.
CREATE TABLE IF NOT EXISTS public.pending_renders (
    job_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    project_id TEXT,
    project_title TEXT,
    version_number INT DEFAULT 1,
    livepeer_job_id TEXT,
    scene2_job_id TEXT,
    audio_job_id TEXT,
    model TEXT,
    single_take_duration INT,
    director_brief JSONB,
    synthetic_preferences JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration for existing deployments (run once in the SQL editor):
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS livepeer_api_key TEXT;
-- (pending_renders is covered by the CREATE TABLE IF NOT EXISTS above.)

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_renders ENABLE ROW LEVEL SECURITY;

-- Production Security Policies:
-- Restricts rows so callers can only view and update their own records matching their verified identity.
-- When using Supabase JWT / Auth:
CREATE POLICY "User profiles self access"
    ON public.profiles
    FOR ALL
    USING (email = auth.jwt() ->> 'email' OR auth.role() = 'service_role')
    WITH CHECK (email = auth.jwt() ->> 'email' OR auth.role() = 'service_role');

CREATE POLICY "User projects self access"
    ON public.projects
    FOR ALL
    USING (user_id = auth.jwt() ->> 'email' OR auth.role() = 'service_role')
    WITH CHECK (user_id = auth.jwt() ->> 'email' OR auth.role() = 'service_role');

CREATE POLICY "User memories self access"
    ON public.memories
    FOR ALL
    USING (user_id = auth.jwt() ->> 'email' OR auth.role() = 'service_role')
    WITH CHECK (user_id = auth.jwt() ->> 'email' OR auth.role() = 'service_role');

CREATE POLICY "User pending renders self access"
    ON public.pending_renders
    FOR ALL
    USING (user_id = auth.jwt() ->> 'email' OR auth.role() = 'service_role')
    WITH CHECK (user_id = auth.jwt() ->> 'email' OR auth.role() = 'service_role');

-- Performance and Security Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects (user_id);
CREATE INDEX IF NOT EXISTS idx_memories_user_id ON public.memories (user_id);
CREATE INDEX IF NOT EXISTS idx_memories_is_active ON public.memories (user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_pending_renders_user_id ON public.pending_renders (user_id);

