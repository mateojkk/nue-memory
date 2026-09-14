# Nue Memory — Handoff

**Repo:** `/home/mateo/basement/Nue`
**Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4
**Run:** `npm run build && npm run start` → http://localhost:3000
**Git:** `b057978`

This is a simple handoff. The landing is for Nue Memory (the infrastructure), not Media Memory. Media Memory is one section on the landing and an app section reachable from there.

---

## What's built

### Landing (http://localhost:3000)
- Hero: **static** headline "The memory infrastructure layer for AI agents" + one support line saying Media Memory is the first app built on it.
- Quickstart section: live code window (Python / TypeScript tabs) + a **code-driven Memory Compression Visual** (animated, no video file, 2480 → 96 token loop).
- Core Differentiator: raw-interaction → temporary / permanent split, **auto-advancing dark-pill tab strip**, cross-fades.
- 7-stage Lifecycle strip (7 cards, staggered scroll reveals only — fade only, no rise).
- Domain-Agnostic Memory Objects demo: JSON preview + category chips.
- Conflict & Evolution simulator: auto-advancing, cross-fading.
- **Media Memory showcase:** framed as "first app built on Nue Memory", not "Nue Memory is Media Memory". Does **not** explain the live studio; it points to it.
- "Launch Media Memory Studio" CTA goes into the app.
- Footer: one understated "Under the Hood" mention (Walrus · Livepeer Agent). Vendors not branded elsewhere.
- Navbar: Product / Media Memory / Developers / Docs. "Get started" goes to the app.
- Theme toggle. Light = white + muted gray + small lavender/blue accent. Dark = zinc black + lavender accent. Brown was removed from surfaces and text.

### App (enter via "Get started")
- Dashboard tabs: Overview, Memories, Media Memory, Projects, API Keys, Docs.
- Overview: honest **Setup & Progress** panel (4 steps from `/api/health` + real state), real Walrus/Livepeer connection dots, "Walrus-Persisted Records: N/M" stat (not fake 100%).
- Memories view: honest blob ID display ("Not yet persisted to Walrus — remember this memory to obtain a blob ID" when empty) + a Walrus-relayer status chip.
- Connections come from `/api/health` (Walrus state + Livepeer key presence). No fake healthy, no brown, no mock fallbacks.

---

## Honest defects — fixed vs still open

### Fixed (were hidden; now surfaced or killed)
- Walrus store silently fell back to **MemWalMock** and fabricated blob IDs when keys were missing. Killed. Now raises `WalrusConfigError` → **503 `configuration_required`** when keys absent. No mock, no fake IDs.
- `health()` used to return fabricated "healthy" with `mode: 'memwal-mock'`. Now honest.
- Livepeer agent called the wrong endpoint and **substituted a stock clip** (Google "ForBiggerBlazes") for real renders. Fixed: endpoint is `/api/mcp/creative`, failures surface loudly, no stock clip.
- Livepeer endpoint was wrong in handoff/env (`/api/mcp` vs `/api/mcp/creative`) — corrected to `/api/mcp/creative`.

### Still open (undone)
- **Keys not added yet.** `.env.example` exists, `.env.local` exists, both empty. No real keys checked in. Without `MEMWAL_PRIVATE_KEY`/`MEMWAL_ACCOUNT_ID` and `LIVEPEER_API_KEY`, the app runs but `/api/health` shows "missing_keys" and Media Memory can't persist to Walrus or call Livepeer with a real key.
  - Livepeer keyless demo credit works without a key (~$10 free) — generate path may work for demo without `LIVEPEER_API_KEY`.
  - Walrus side needs real keys for real persistence.
- **Media Memory is not yet a separate app page/section with its own flow.** It's a showcase on the landing + a dashboard "Media Memory" tab reusing the media loop UI. The intended split ("landing talks about Nue Memory; entering Media Memory shows Media Memory work") is stated here but not yet built out. The CTA exists; the dedicated workspace is the intended next step.
- **Theme fonts via next/font/google, not @fontsource packages.** Fustat, Fragment Mono, EB Garamond. Fine as-is, but if you add packages later, update this.
- **Landing boxes can look terminal-like** (code windows, memory cards, promo split). Intentional as code/meta panels. If you want them less so, that's a styling pass over `MediaMemoryShowcase`, `MemoryObjectsSection`, `QuickstartSection`.

---

## How to run

```bash
npm install
npm run build   # green, 0 type/lint errors
npm run start   # port 3000 by default
```

Dev: `npm run dev` (port 3000). Livepeer probe script: `scripts/probe-livepeer.ts` (tsx) — confirms real MCP creative surface, create_media shape, and the keyless demo step.

---

## Env (what's missing)

Fill `.env.local` (do **not** commit it). At minimum for a real run:

- `MEMWAL_PRIVATE_KEY`
- `MEMWAL_ACCOUNT_ID`
- `MEMWAL_SERVER_URL` (defaults to `https://relayer.memory.walrus.xyz` if omitted)
- `LIVEPEER_API_KEY` (optional for demo flow because of Livepeer keyless credits)

---

## Repo map (short)

- `app/` — Next.js App Router: `page.tsx` (landing + app switch), `layout.tsx`, `globals.css`, API routes under `app/api/`.
  - `app/api/memwal/route.ts` — memory CRUD (retrieve, remember, forget, reset).
  - `app/api/generate/route.ts` — brief enrichment + Livepeer media generation path.
  - `app/api/health/route.ts` — honest system status used by dashboard.
- `components/`
  - `landing/` — `HeroSection`, `QuickstartSection`, `DifferentiatorSection`, `LifecycleSection`, `MemoryObjectsSection`, `EvolutionSection`, `MediaMemoryShowcase`, `LandingFooter`, plus `MemoryCompressionVisual`.
  - `dashboard/` — `NueDashboard`, `OverviewView`, `MemoriesView`, `MediaMemoryWorkspace`.
  - `NueNavbar`, `NueLogo`, `ThemeToggle`, `MemoryPanel`, `EnrichedBriefModal`, `MediaPreview`, `AgentChat`.
  - `motion.tsx` — motion system (fade-only scroll reveals, `TypewriterHeadline` helper currently unused, `AnimatedTabs`, `useAutoStage`).
- `lib/`
  - `types.ts` — `CreativeProject`, `MediaVersion`, `ChatMessage`, `MediaPreference`, `StructuredMemory`.
  - `hooks/useSystemHealth.ts` — health hook + status indicator helper.
  - `nue-memory/` — engine: `storage/walrus-store.ts`, `media-memory/service.ts`, `media-memory/livepeer-agent.ts`, `evolution.ts`, `extractor.ts`, `retrieval.ts`, `sdk.ts`, `core/types.ts`.
  - `walrus-memwal/client.ts` — backward compat re-export of service.
  - `livepeer/agent.ts` — backward compat re-export.
- `scripts/` — probe + old test scripts.

---

## What to do next

1. Add real keys to `.env.local` (or leave `LIVEPEER_API_KEY` out and use Livepeer keyless demo credit).
2. Decide whether Media Memory becomes its own dedicated workspace/section in the app (the split is stated here but the workspace itself is not finished as a separate flow).
3. If you want landing boxes less terminal-like, do a styling pass over `MediaMemoryShowcase`, `MemoryObjectsSection`, `QuickstartSection`.
4. If you want the typewriter back anywhere, `TypewriterHeadline` still exists in `motion.tsx` — currently unused after the headline went static.
5. If you want Walrus/MemWal/Livepeer mentions anywhere besides the footer's one "Under the Hood" line, keep them out of the landing body — Nue is the product.

---

## Latest commits (context)

- `b057978` — code-driven Memory Compression Visual replacing static workflow list.
- `b280868` — mem0-style tab choreography: dark-pill auto-advancing tabs + cross-fading splitter demo.
- `18c5b72` — static hero headline, typewriter removed.
- `2cf9202` — em dashes removed; motion aligned to mem0 measured tokens (fade-only reveals, +100ms staggers, blur-13px navbar, announcement bar).
- `0d559d6` — motion system added (scroll reveals, typewriter headline, auto-advancing demo, tab cross-fades).
- `80c8cc3` — de-branded vendors on landing; one understated footer mention.
- `b66e585` — mem0 exact tokens/fonts/type scale.
- `7fbcb8f` — brown out of landing text, copy trimmed.
- `c347461` — palette neutralized (white/gray surfaces, brown only as accent).
- `1067f02` — mem0-style restraint (no stacked shadows/glows/accent-border noise).
- `eeee5bc` — light/dark theming, theme toggle, honest Setup & Progress panel.
- `570b285` — Livepeer probe script + confirmed MCP creative surface.
- `441ba27` — Livepeer endpoint fixed + stock clip substitution killed.
- `ef78d3d` — honest health/status wiring + /api/health + Setup & Progress.
- `58cf07f` — handoff mock-mode note corrected.
- `3fdb74f` — handoff was expanded into a big spec (overgrown — this file replaces it).
- `1171d27` — strict live-only Walrus mode (mock fallback removed).

---

Handed off by the current maintainer. Keep it simple: Nue Memory is the product. Media Memory is one use case. Don't make the landing look like a Media Memory billboard.
