# Nue & Nue Motion

> **Livepeer Agent Hackathon 2026**  
> **Track 3 - Innovation Track**  
> *Autonomous video generation with continuous agent memory, powered by Livepeer Agent & Sui Walrus.*

---

## What is Nue?

AI video tools forget everything between sessions. Tell one "fast intros, big captions" on Monday and you're retyping it Wednesday.

**Nue Memory** is the memory layer that lets agents keep your taste. It classifies every message (fleeting instruction vs. standing preference), extracts durable rules with an LLM, appends them as additive facts, and recalls them into future work. MemWal stores text. Nue remembers taste.

**Nue Motion** is the first app built on it: a video agent that directs 15-second cinematic takes with Livepeer Seedance, remembers how you like things, and revises by continuing the same shot instead of re-rolling blind.

---

## Key Capabilities

* **Zero Re-prompting**: State a preference once ("I like my sound fading out") — no render starts, no credits burn, the rule saves itself and applies to every future brief.
* **Revisions That Continue**: v2 reuses v1's seed (same composition, varied) and starts from v1's last frame via image-to-video. Same ocean, not a new roll.
* **ADD-only Memory**: New rules append as facts; history is preserved. Contradictions resolve at recency-weighted retrieval ranking. Explicit deletes tombstone on Walrus and stay dead across refreshes, devices, and cold starts.
* **Honest Billing**: Livepeer actuals per take (~$3.47 for 15s on Seedance), held at dispatch and settled to reported cost with refunds on failure. Bring your own Livepeer key and pay $0 here — keys are AES-sealed server-side and never shown again.
* **Single 15s Takes**: Livepeer's ceiling per render, stated not faked. Renders survive tab switches, refreshes, and hours away — reattach polling or resume cross-device from durable descriptors.
* **Frictionless Creator Auth**: Passwordless email authentication via Magic Labs (`magic-sdk`), granting every creator account a complimentary $10.00 compute grant.
* **Decentralized Persistence**: Per-user `nue-{email}` vaults on **Sui Walrus (MemWal)** — your rules never mix with anyone else's.

---

## Livepeer Agent Integration

Nue Motion connects directly to the **Livepeer Agent Network** over MCP:

* **Endpoint**: `https://agent.livepeer.org/api/mcp/creative`
* **Video**: `seedance-25-t2v` text-to-video, `seedance-25-i2v` for frame-chained revisions (alt: `ltx-25-t2v-pro` on request).
* **Audio**: generated soundtracks with approved memory rules composed into the music prompt; approved fade rules ship stems unmuxed for exact player-side fade-out.
* **Prompt Orchestration**: recalled rules compile into director briefs, preflight plans, and soundtrack prompts. ByteDance scanner false positives self-heal: strip, paraphrase, re-roll once — at dispatch and mid-render.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Nue Motion UI                          │
│        (Next.js 15 App Router · Tailwind CSS v4)            │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              Next.js Server API Routes (TypeScript)         │
│  /api/generate (Groq director · Livepeer dispatch · billing)│
│  /api/classify (LLM extraction) · /api/memwal (CRUD)        │
│  /api/pending-renders (cross-device resume)                 │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               ▼                               ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│   Livepeer Agent Network     │ │      Sui Walrus MemWal       │
│   (Real-time GPU Video AI)   │ │  (Decentralized Persistence) │
└──────────────────────────────┘ └──────────────────────────────┘
```

> Note: `api/index.py` (FastAPI) is legacy and uncalled — all classification,
> enrichment, and orchestration run in the TypeScript routes above. It is
> slated for removal.

---

## Quickstart & Local Development

### 1. Prerequisites
* **Node.js**: v20+ and `npm`

### 2. Clone & Install
```bash
git clone https://github.com/mateojkk/nue-memory.git
cd nue-memory
npm install
```

### 3. Environment Setup
Copy the example environment file and configure your keys:
```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `GROQ_API_KEY` | Groq key for the creative director + memory extraction (default model `openai/gpt-oss-120b` via `GROQ_MODEL`) |
| `LIVEPEER_API_KEY` | Livepeer/Daydream key (optional: keyless ~$100 demo tier by default; creators can also attach their own key in-app via BYOK) |
| `LIVEPEER_AGENT_MCP_URL` | Livepeer Agent MCP URL (`https://agent.livepeer.org/api/mcp/creative`) |
| `MEMWAL_PRIVATE_KEY` | Ed25519 private key for Sui Walrus transactions (also seals stored third-party keys) |
| `MEMWAL_ACCOUNT_ID` | Sui delegate account ID for Walrus storage |
| `MEMWAL_SERVER_URL` | Walrus Memory relayer (defaults to production) |
| `NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY` | Magic Labs publishable key for passwordless email auth |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL (profiles, projects, pending renders) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous API key |

Then run the Supabase migrations in `supabase_schema.sql` (profiles `livepeer_api_key` column, `pending_renders` table) via the SQL editor.

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the landing page, or visit [http://localhost:3000/motion](http://localhost:3000/motion) to open the Nue Motion workspace.

Useful scripts: `npm run typecheck`, `npx tsx scripts/verify-prompt-sanitizer.ts`, `npx tsx scripts/probe-livepeer.ts`.

---

## Deployment (Vercel)

1. Connect the repository to Vercel.
2. Set production environment variables in the Vercel dashboard.
3. Deploy (Content-Security-Policy + hardening headers ship in `next.config.ts` — verify Magic login after each deploy, since an over-strict policy breaks auth silently).

---

## Track Alignment (Track 3: Innovation)

* **Centrality of Livepeer Agent**: Livepeer Agent is the core media generation engine powering video synthesis across every project.
* **Product Judgment & UX**: No vendor plumbing or blob IDs in user surfaces. Creators direct video with an AI assistant that remembers taste — and every failure edge (scanner false flags, throttled writes, killed connections) fails honestly with recovery instead of fake success.
* **Originality**: Continuous, cross-session, cross-device memory for generative video — plus revisions that continue the same shot instead of re-rolling it.

---

## License

MIT License - see [LICENSE](LICENSE) for details.
