# Nue — Handoff (2026-09-21)

**Repo:** `/home/mateo/basement/Nue` → `github.com:mateojkk/nue-memory.git` (branch `main`)
**Stack:** Next.js 15 (App Router), TypeScript, Tailwind v4, Groq LLM, Livepeer Agent MCP (Seedance 2.5), Sui Walrus MemWal
**Run:** `npm run build && npm run start` → http://localhost:3000 (build green 2026-09-21)
**Naming:** infra/product = **Nue Memory**, flagship video app = **Nue Motion** (renamed from "Media Memory" across code, types, routes, tabs, docs this session).

---

## 1. What was done this session

### A. Prompt sanitizer vs ByteDance safety scanner (false positives)
- Problem: every video prompt with negative constraints ("No subtitles/logos…"), `Sound:` clauses, or quoted lyric/dialogue text risked `partner_validation_failed` / `content_policy_violation`.
- `lib/ai/nue-director.ts`: `sanitizePromptForDiffusion` now strips all `No dialogue/text/subtitles/logos/watermarks/recognizable…` sentences, `No … on screen` sentences, `Sound:/Audio:/Music:` clauses, `Add … sounds/music/…` sentences, and duration phrasing. `simplifyVideoPromptForRetry` mirrors it so a retry is always a genuinely different payload. `stripLyricTextFromVideoPrompt` (stage 1) + retry (stage 2) unchanged in design.
- `app/api/generate/route.ts`: dispatch uses `stripLyricText(sanitizePrompt(...))`, not lyric-strip alone. Policy-rejection retry only fires when the payload actually changed (kills the "take 2 identical retry" loop).
- Verified live: raw water/ocean prompt dispatched and rendered to `done` with playable MP4s. `scripts/verify-prompt-sanitizer.ts` passes.

### B. Honest 15s single-take ceiling
- Livepeer `create_media.duration` is `{integer, 3–15}` and refuses larger pre-dispatch (`too_big`, not billed). `MAX_TAKE_SECONDS = 15` enforced in director + route; the director states the delivered length instead of promising 30–60s. Multi-scene stitching branch kept dormant.

### C. Durable memory deletes (tombstones)
- Root cause found live: the real MemWal client has **no** `forget`/`delete` (only the mock does), so deletes cleared local cache only and the next Walrus recall resurrected them. Same flaw hid in supersede-`update` and `clearAll`.
- `WalrusMemWalStore.delete` now writes a tombstone blob (same id, `isActive:false`, `metadata.deleted:true`); `update` persists lifecycle changes the same way. `list`/`search` dedupe by id (latest `updatedAt` wins) and filter tombstones from every view.
- Verified live end-to-end on real Walrus: save → listed → delete → gone from list **and** search.

### D. Delete UX + Walrus throttle resilience
- Observed live: relayer throttle (`Too Many Requests` on seal encrypt; jobs stalling past poll timeout).
- `rememberWithRetry`: 2 attempts, same idempotency key (collapses onto original job, no double-write), 25s per-attempt cap + 3s backoff. Applied to save, supersede-markers (later removed, see F), tombstones.
- `app/api/memwal/route.ts`: `maxDuration = 120` (was: platform killed long polls → bare `NetworkError`); forget skips rehydrate on warm cache; unknown id → honest 404; remember saves first, retires best-effort with `warnings[]` (later simplified, see F).
- `AppShell handleForgetMemory`: optimistic removal, restores + re-syncs on failure instead of fake-deleting.

### E. Memories tab loading
- Tab flashed "No preferences learned yet" while Walrus recall was in flight. Added `isLoadingMemories` (AppShell → NueDashboard → MemoriesView) with skeleton cards. Server: alias-namespace recalls parallelized (`Promise.all` in `list` + `search`).

### F. Mem0-style auto-learning (replaces regex + supersede engine)
- **LLM extraction**: `extractMemories` is now async LLM-only (`gpt-oss-120b`) with active memories as dedupe context (lookup→extract→dedupe, one call). **The entire regex engine (`TEMPORARY_MARKERS`, `PERSISTENT_MARKERS`, `SEMANTIC_PATTERNS`) is deleted.** Throws honestly when Groq is down — no guessing.
- **ADD-only**: `engine/evolution.ts`, `media-memory/evolution.ts`, `evolution.ts` bridge deleted. `sdk.add` appends facts; `remember` route appends (no deactivation); contradictions resolve at recency-weighted retrieval ranking; history preserved. Explicit `sdk.evolve()` kept. Tests rewritten to new semantics.
- **Auto-save**: standing preference statements ("I like…", "from now on…") hit a memory-only path in `handleSendMessage` (plus first-message guard) → `rememberNow` persists immediately with a "Remembered … undo in Memory tab" note. **Zero render, zero credits.** Revision feedback keeps the Remember confirmation card (ambiguous scope). Server backstop: director `memory` intent + `memoryCandidate` → `pendingMemory` → same Remember UI.
- **Fade-out rule**: extractor learns "Fade out soundtrack over the final N seconds…" (category `music`); duration-pattern cross-talk guard stops "2s fade" becoming a bogus "Prefer 2 second video" memory. Verified live against the exact user sentences. NOT baked into the muxer per user call — it lives as a per-user memory, others unaffected. Note: Livepeer `assemble` has no audio-fade param and the ffmpeg fallback can't persist files on Vercel, so the fade promise currently only materializes via the music-generation prompt.

### G. Rename: media-memory → nue-motion
- `lib/nue-memory/media-memory/` → `lib/nue-memory/nue-motion/`; `MediaMemoryWorkspace/Showcase` → `NueMotionWorkspace/Showcase`; `MediaPreference` → `MotionPreference`; `structuredToMediaPref/mediaPrefToStructured` renamed; dashboard tab slug `media-memory` → `motion` (legacy slug auto-migrates); package name `nue-motion`; display strings, comments, file maps, handoff/rules docs updated.
- **Untouched on purpose (persisted data compat):** `'media'` domain/scope literals, `'media_preference'` type literal, category values, Walrus namespaces (`nue-{email}`), `EvolutionResult` removed only where dead (types.ts entry deleted).

---

## 2. Verification status (2026-09-21)
- `npm run typecheck` — clean.
- `npm run build` — green, all 14 pages/routes.
- `scripts/verify-prompt-sanitizer.ts` — ALL PASS.
- Live probes (real endpoints, keyless demo credit): 3 video renders reached `done` with playable MP4s; tombstone delete e2e PASS (list+search clean); LLM extraction probe correct on fade/repeat/one-off/banter inputs.
- `scripts/test-phase2-engine.ts` + `test-sdk.ts` rewritten to new semantics but **not executed** (they spend live Walrus writes; run deliberately).

## 3. Known open issues (not fixed)
1. **Walrus relayer congestion** (observed 2026-09-21): write throttle + stalled jobs. Mitigated (retry, honesty), not solved — it's upstream.
2. **No real audio fade-out in prod**: `assemble` lacks the param; ffmpeg fallback output can't persist on Vercel serverless. Needs a finishing step on persistent infra.
3. **Implicit signals unlearned**: approvals ("you cooked") and corrections teach nothing yet.
4. **Recall is vector-only**: no BM25/keyword hybrid; topK-50 cap is a coverage ceiling for huge namespaces.
5. **Contradiction ranking is recency-heuristic** (10% weight), not LLM-resolved like Mem0/Zep.
6. Old test junk may still sit in the user's Walrus namespace (cartoon/xylophone/30s rules) — delete/reset is durable now, so clear it once.

## 4. How to run / env
```bash
npm install
npm run build && npm run start   # :3000; /motion is the studio
```
`.env.local` (gitignored, filled locally): `MEMWAL_PRIVATE_KEY`, `MEMWAL_ACCOUNT_ID`, `MEMWAL_SERVER_URL`, `GROQ_API_KEY` (+ optional `GROQ_MODEL`, default `openai/gpt-oss-120b`), Supabase + Magic keys. `LIVEPEER_API_KEY` optional (keyless demo credit otherwise).

## 5. Repo map (post-rename)
- `app/api/generate|memwal|classify|health|profile|projects` — generation pipeline, memory CRUD, LLM classify, status, credits, projects.
- `lib/ai/nue-director.ts` — Groq director: intent routing (incl. `memory` intent), diffusion sanitizers, error humanizer.
- `lib/nue-memory/engine/extractor.ts` — LLM extraction; `storage/walrus-store.ts` — tombstones, retry, dedupe; `nue-motion/service.ts` — MemWal adapter; `nue-motion/livepeer-agent.ts` — MCP client; `sdk.ts` — dev SDK (ADD-only).
- `components/AppShell.tsx` — chat routing (memory-only path), optimistic forget, auto-save; `dashboard/NueMotionWorkspace.tsx` — studio; `dashboard/MemoriesView.tsx` — memory manager.
