# Nue & Nue Motion: Architectural & Engineering Compendium

> **From Ground Truth to Autonomous Creation: A Bottom-to-Top Technical Record**  
> **Repository:** `mateojkk/nue-memory`  
> **Track:** Livepeer Agent Hackathon (Track 3 - Innovation Track)  
> **Core Technologies:** Next.js 15, Groq (Llama 3.3 70B), Sui Walrus (MemWal), Livepeer Agent MCP, Supabase, Tailwind CSS v4  

---

## 1. Executive Summary & Vision

AI media generation has historically suffered from severe **session amnesia**. Every time a creator opens a new conversation or starts a new video project, the AI forgets their aesthetic preferences, branding guidelines, preferred pacing, vocal styles, and past corrections. Creators are trapped in repetitive prompt loops (*"make it 16:9"*, *"warm golden hour lighting"*, *"no ambient synths"*, *"faster pacing"*).

**Nue** solves this by introducing a continuous, decentralized memory layer for AI agents. Rather than dumping raw chat histories into the context window (which inflates token costs and degrades LLM reasoning), Nue observes creator interactions, extracts structured aesthetic preferences, resolves contradictions through autonomous evolution, and cryptographically persists them to **Sui Walrus (MemWal)**.

**Nue Motion** is the flagship generative video studio built on top of Nue Memory and the **Livepeer Agent Network**. In Nue Motion, creators do not write prompts for a cold, robotic dispatcher—they collaborate with an AI co-director that acts like a true creative partner ("buddy"), remembers their artistic taste across projects, directs single continuous Seedance 2.5 takes, and shields creators from upstream GPU errors.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           TOP: CREATOR INTERFACE                        │
│             Next.js 15 App Router · Studio Chat · Timeline Player       │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    AGENT BRAIN & CREATIVE DIRECTOR                      │
│             Groq Llama-3.3-70B · withMemWal AI Middleware · Persona     │
└───────────────────┬─────────────────────────────────┬───────────────────┘
                    │                                 │
                    ▼                                 ▼
┌───────────────────────────────────────┐ ┌───────────────────────────────┐
│     COMPUTE & DIFFUSION ENGINE        │ │  DECENTRALIZED MEMORY & STATE │
│   Livepeer Agent MCP (Seedance 2.5)   │ │  Sui Walrus MemWal (BLOBs)    │
│   Multi-Scene Stitcher (ffmpeg/MCP)   │ │  Supabase DB & globalThis Map │
└───────────────────────────────────────┘ └───────────────────────────────┘
                               BOTTOM
```

---

## 2. Bottom-to-Top Architectural Layers

### Layer 1: Decentralized Persistence & State (The Foundation)

#### 1. Sui Walrus MemWal (`@mysten-incubation/memwal`)
- **Cryptographic Decentralization**: User memories are not trapped in a centralized proprietary silo. Each creator has an Ed25519 Sui cryptographic identity (`MEMWAL_PRIVATE_KEY` / `MEMWAL_ACCOUNT_ID`) and a dedicated Walrus namespace (`nue-{user_email}`).
- **Zero-Mock Integrity**: Nue enforces a strict live-only policy. If Walrus keys are absent, the system surfaces an honest `WalrusConfigError` (`503 configuration_required`) rather than faking persistence with temporary in-memory mocks.
- **Autonomous Rule Evolution & Conflict Supersession**: When a user changes their preference (e.g., from *"ambient electronic soundtrack"* to *"upbeat acoustic guitar"*), Nue marks the older memory as superseded rather than letting contradictory tokens corrupt future prompt assemblies.
- **Bi-Directional AI Middleware**: Integrated directly with Groq via `withMemWal`:
  - **Pre-flight Recall**: Automatically fetches top relevant decentralized preferences before each director decision.
  - **Post-flight Extraction**: Automatically analyzes user revision feedback and commits new taste profiles to Walrus.

#### 2. Relational Metadata & Credit Balance (Supabase)
- **Creator Profiles**: Secure credit ledger granting users compute balance ($0.05 per video render take).
- **Project & Version History**: Relational records of project titles, version iterations, media URLs, aspect ratios, and chat transcripts for instant instant-load sessions.

#### 3. Global Resilient Job Registry (`lib/jobs/registry.ts`)
- **Next.js HMR & Serverless Boundary Isolation**: Standard in-memory maps in Next.js get wiped during hot module reloading or when route handlers execute across isolated workers.
- **`globalThis` Persistence**: The `jobRegistry` singleton is bound to `globalThis.nueJobRegistry`. Multi-scene jobs (such as 4-scene, 60-second video assemblies) retain their state across asynchronous polling cycles over multiple minutes, preventing multi-scene jobs from degrading into 15-second single takes.

---

### Layer 2: Compute, Media Synthesis & Assembly Engine

#### 1. Livepeer Agent MCP Network
- **MCP Endpoint**: Connects via Model Context Protocol to `https://agent.livepeer.org/api/mcp/creative`.
- **Flagship Video Diffusion Models**:
  - `seedance-25-t2v` (ByteDance Seedance 2.5 Text-to-Video): Flagship model for high-motion, cinematic video rendering.
  - `seedance-25-i2v` (Seedance Image-to-Video): High-fidelity animation when an image reference is uploaded.
- **AI Soundtrack & Vocal Synthesis**:
  - Livepeer music generation action producing synchronized audio tracks.
  - Singing vocals support: Preserves verbatim user-provided lyrics and feeds them into melodic vocal synthesis.

#### 2. Take Sequencing & Timeline Stitching (`lib/media/timeline-stitcher.ts`)
- **Provider Duration Ceiling (verified against the live MCP surface, 2026-09-21)**:
  - Livepeer's creative surface validates `create_media.duration` as `{ type: 'integer', minimum: 3, maximum: 15 }` and refuses anything larger **before dispatch** (`issue_code: too_big`, `billing_note: not_billed_pre_dispatch`). Nothing renders and nothing is charged on a refusal.
  - Seedance 2.5 does reach 30s per pass, but only through `run_capability` with a **string** `inputs.duration` of `"4".."30"`. That tool is exposed on `/api/mcp/raw` and **not** on `/api/mcp/creative`, which is the surface Nue Motion is wired to. Livepeer's own `submit_creative_job.target_duration_sec` confirms the design: runtime is *"clamped to what capabilities accept (3-15s per shot), so ~60s over 6 scenes becomes 10s each."*
  - **Nue Motion therefore ships one continuous 5-15s take per render** and states that limit honestly in the director's reply, instead of promising a length it cannot deliver.
- **Multi-Take Assembly (dormant)**: the timeline branch still stitches N takes via Livepeer `assemble` (1-60 clips) or the local `ffmpeg` fallback, and re-activates automatically if the per-call cap ever rises above a single take.
- **Narrative Continuity & Character DNA (Google & Higgsfield Standard)**:
  - **Google-Style Character DNA**: Groq extracts an immutable `characterBible` locking exact facial features, hair, wardrobe, and colors across all scene prompts so diffusion attention never drifts.
  - **Higgsfield-Style Soul ID / Character Anchoring**: When recurring characters are identified, Nue Motion generates a canonical Master Concept Anchor image (`flux-schnell`, ~2s). The anchor image URL is stored with the job for UI display; downstream scene takes use `seedance-25-t2v` with the full `characterBible` injected into every scene prompt for visual continuity. (`seedance-25-ref2v` retired 2026-09-19 — 69% success rate, $49.08 wasted in 7 days, provider-attributed failures.)
- **Dual-Mode Stitching Architecture with Cinematic Cross-Dissolves**:
  1. Primary: Dispatches clips to Livepeer MCP `assemble` tool with crossfade transitions.
  2. Fallback: Local high-performance `ffmpeg` timeline stitcher (`stitchTimelineWithFfmpeg`) that probes exact frame durations, applies smooth `xfade` (0.6s cinematic cross-dissolves) between takes to eliminate abrupt cutoffs, and muxes an unbroken 60s master soundtrack bed.

#### 3. Diffusion Prompt Sanitizer (`sanitizePromptForDiffusion`)
- **Overcoming Partner Safety False Positives**: Automated safety scanners in commercial diffusion pipelines (such as ByteDance's) inspect prompt tokens for keywords matching copyright policies.
- **Negative Constraint Stripping**: Prompt disclaimers like *"do not imitate any existing nursery rhyme"* or *"no copyrighted characters"* ironically trip keyword filters. Nue Motion automatically sanitizes prompts before dispatch, stripping negative legalistic jargon while preserving positive artistic and visual instructions.

#### 4. Empathetic Upstream Error Shielding (`humanizeUpstreamError`)
- Replaces raw Python/JSON 502 crash dumps (`SDK /inference failed: {'error': 'pymthouse path is pinned...'}`) with empathetic, human-level explanations.
- When an automated scanner false-flags an original song, Nue explains the false alarm clearly and offers a one-click re-queue with sanitized prompt tokens.

---

### Layer 3: Agent Intelligence & Conversational Director (The Brain)

#### 1. Groq High-Speed LLM Engine (`lib/ai/nue-director.ts`)
- Powered by `llama-3.3-70b-versatile` (and `openai/gpt-oss-120b` on Groq Cloud).
- Sub-second inference (~400ms) enables conversational fluency without blocking the studio experience.

#### 2. Unified Intent Classification (Chat vs. Render)
- **Conversational Queries (`shouldGenerate: false`)**:
  - Casual banter, feedback, laughing, reactions, questions, or ideas (e.g. *"the funny part is that, i just made that song!"*, *"are you sure Groq is working?"*).
  - Returns immediately with an authentic conversational response.
  - **Zero compute cost ($0.00)** and zero GPU dispatch.
- **Creation & Render Requests (`shouldGenerate: true`)**:
  - Explicit creation prompts or approved scene plans.
  - Deconstructs the prompt into visual theme, pacing, aspect ratio, audio style, lyrics, and sequential scene takes.
  - Verifies credit balance and dispatches parallel GPU tasks.

#### 3. Creative Studio "Buddy" Persona
- Treats the creator like a peer and friend in a music/film studio—witty, encouraging, collaborative, and sharp.
- Celebrates user creativity (e.g., reacting enthusiastically when a user writes their own lyrics).
- Acknowledges mistakes transparently without bureaucratic corporate apologies, and never promises a length it cannot render (*"Ah man, my bad! A single Livepeer take caps at 15s, so here is the strongest 15s chapter of that story - say the word and I will keep the same shot rolling as a follow-up take."*).

#### 4. Contextual Revision & Correction Engine
- In `components/AppShell.tsx`, messages starting with *"but i said..."*, *"wait"*, *"actually"*, *"change the..."* are automatically linked to the active take brief as feedback context, rather than erasing the project's characters and setting.

---

### Layer 4: Application & User Experience (The Top)

#### 1. Landing Interface (`/`)
- **Restrained, Mem0-Inspired Aesthetic**: Modern typography (`Fustat`, `Fragment Mono`, `EB Garamond`), muted monochromatic surfaces, and subtle lavender accents.
- **Interactive Demos**:
  - **Code-Driven Memory Compression Visual**: Animates real token reduction (2480 tokens compressed into 96 structured tokens).
  - **Tab Choreography**: Dark-pill auto-advancing tabs demonstrating Raw Interaction → Memory Extraction → Decentralized Blob Storage.
  - **Conflict & Evolution Simulator**: Interactive demo showing rule supersession in real time.

#### 2. Studio Workspace (`components/AppShell.tsx`)
- **Interactive Multi-Project Drawer**: Switch between creative campaigns and inspect version history.
- **Conversational Agent Chat**: Multi-modal chat panel supporting text, prompt suggestions, image drag-and-drop, and clipboard paste (with automatic client-side canvas compression).
- **Real-Time Video Player**: Aspect ratio toggles (16:9, 9:16, 1:1), playback controls, and synchronized soundtrack audio playback.
- **Live Generation Progress**: Multi-stage progress indicators displaying elapsed time and expected SLA during Seedance diffusion renders.
- **MemWal Memory Drawer**: Live view of Walrus-persisted aesthetic preferences with manual remember/forget controls.
- **Passwordless Authentication**: Powered by Magic Labs (`magic-sdk`) for seamless email login.

---

## 3. Comprehensive File & Module Map

| File Path | Role & Key Responsibilities |
|---|---|
| `lib/ai/nue-director.ts` | **Agent Brain**: Groq LLM integration, withMemWal middleware, studio buddy persona, prompt sanitizer, lyrics extractor, error humanizer. |
| `lib/jobs/registry.ts` | **State Persistence**: `globalThis`-persisted job registry tracking multi-scene parallel takes across polling cycles. |
| `app/api/generate/route.ts` | **Generation Pipeline**: Orchestrates brief enrichment, conversational routing, credit verification, Livepeer dispatch, and timeline polling. |
| `app/api/memwal/route.ts` | **Memory CRUD Route**: Direct Walrus MemWal endpoints to query, commit, delete, or reset user preferences. |
| `app/api/health/route.ts` | **Honesty Telemetry**: Live status check of Walrus relayer connection and Livepeer API key presence. |
| `lib/media/timeline-stitcher.ts` | **Timeline Assembly**: Local FFmpeg engine for multi-scene video concatenation and audio track muxing. |
| `lib/nue-memory/media-memory/livepeer-agent.ts` | **Livepeer MCP Client**: Model Context Protocol client for `create_media`, `get_create_media`, and `assemble`. |
| `lib/nue-memory/storage/walrus-store.ts` | **Walrus Storage Driver**: Low-level Sui Walrus client managing blob storage and cryptographic signing. |
| `components/AppShell.tsx` | **Studio Application Shell**: State coordinator for chat, video player, version history, and generation polling. |
| `components/AgentChat.tsx` | **Chat Interface**: Multi-modal input panel with image upload, drag-and-drop, and prompt suggestions. |
| `components/landing/*` | **Landing Page Components**: Hero, Quickstart, Differentiator, Lifecycle, and Memory Showcase. |

---

## 4. Key Milestones Completed

1. **Decentralized Memory Layer**: Built live Sui Walrus MemWal client with zero mock fallbacks, Ed25519 cryptographic signing, and namespace isolation.
2. **Livepeer Agent MCP Pipeline**: Connected directly to Livepeer Creative MCP (`https://agent.livepeer.org/api/mcp/creative`) powering Seedance 2.5 video diffusion and AI audio generation.
3. **Honest Duration Policy**: Traced a silent 30s-to-15s downgrade to Livepeer's `create_media` schema (`duration` is an integer capped at 15, refusing anything larger pre-dispatch with `too_big`), then clamped every dispatch path to that ceiling and made the director state the delivered length instead of promising a longer one. The timeline branch that stitches N takes remains dormant and re-activates if the cap rises.
4. **Conversational "Buddy" Director**: Revamped Nue from a rigid command parser into a warm, witty creative studio partner that can banter, answer questions, and brainstorm without burning GPU credits.
5. **Diffusion Prompt Sanitizer**: Stripped negative disclaimers to eliminate false-positive partner copyright errors on original user songs and concepts.
6. **Robust Job State Persistence**: Bound in-memory job tracking to `globalThis`, so long-running take state survives the asynchronous polling cycles instead of degrading to the route's fallback duration.
7. **Empathetic Error Shielding**: Replaced raw technical stack traces with human explanations and one-click recovery.
8. **Restrained Design System**: Built clean, mem0-inspired dark/light design system with zero vendor noise.

---

## 5. Future Roadmap & Vision

### Phase 1: Enhanced Agentic Collaboration (Near Term)
- **Specialized Subagent Team**:
  - *Director Agent*: Oversees narrative pacing, character continuity, and visual aesthetic.
  - *Sound Designer Agent*: Focuses exclusively on musical arrangement, vocal cadence, and sound effects.
  - *Continuity Supervisor*: Inspects generated video frames to guarantee exact character resemblance between scenes.
- **Local Sub-Millisecond Vector Cache**: Deploy client-side vector index (Wasm-based) to cache Walrus memories locally for zero-latency retrieval.

### Phase 2: In-Studio Timeline & Canvas Editing (Mid Term)
- **Interactive Multi-Track Editor**: In-browser video timeline where creators can visually drag, trim, re-order scenes, and swap soundtrack takes.
- **Direct Frame Inpainting & Reroll**: Click on any specific 2-second segment in the video player to re-render that specific shot while keeping the rest of the 60-second video intact.
- **Image-to-Video Storyboarding**: Upload up to 4 keyframe images to anchor each 15-second scene in a 60-second narrative.

### Phase 3: Decentralized Creator Economy (Long Term)
- **Sui Smart Contract Billing**: Allow creators to pay for GPU generation credits directly via SUI tokens or Walrus storage payments.
- **Livepeer Decentralized CDN & Transcoding**: Push completed 60s videos to Livepeer decentralized transcoding pipelines for instant 4K, HLS, and VP9 streaming.
- **Portable Memory NFTs / Objects**: Mint user aesthetic memory graphs as Sui dynamic objects, enabling creators to take their learned AI director taste into other creative tools and games.
