# Nue & Nue Motion

> **Livepeer Agent Hackathon 2026**  
> **Track 3 — Innovation Track**  
> *Autonomous video generation with continuous agent memory, powered by Livepeer Agent & Sui Walrus.*

---

## What is Nue?

AI agents are inherently ephemeral: they forget user feedback and creative preferences between sessions. In media generation, this forces creators into repetitive prompting loops ("make the captions bigger", "faster pacing", "muted color grading") on every new project.

**Nue** is the memory infrastructure layer for AI agents. It continuously observes interactions, extracts structured creative preferences, resolves contradictions (supersessions), and persists learned context across projects and sessions.

**Nue Motion** is the flagship application powered by Nue and the **Livepeer Agent Network**. In Nue Motion, creators direct video generation with an agent that continuously adapts to their aesthetic taste.

---

## Key Capabilities

* **Zero Re-prompting**: Give feedback once on a video, and Nue extracts your taste into persistent rules that auto-apply to all future generations.
* **Autonomous Memory Evolution**: When your taste evolves (e.g., from "cinematic slow pacing" to "fast 0-5s hooks"), Nue automatically supersedes the conflicting rule rather than corrupting your prompt context.
* **Dual Runtime Engine**:
  * **Next.js 15 (App Router)** frontend and interactive creative workspace.
  * **FastAPI Serverless Backend** (`api/index.py`) for semantic classification, prompt enrichment, and Livepeer Agent tool coordination.
* **Frictionless Creator Auth**: Passwordless email authentication via Privy, granting every new creator account **$10 in free video generation credits**.
* **Decentralized Persistence**: Deep integration with **Sui Walrus (MemWal)** for cryptographic, decentralized memory storage.

---

## Livepeer Agent Integration

Nue Motion connects directly to the **Livepeer Agent Network** through the Model Context Protocol (MCP):
* **Endpoint**: `https://agent.livepeer.org/api/mcp`
* **Profile**: Lean tool profile (`X-Livepeer Agent-Tool-Profile: lean`) exposing core creative tools: `create_media`, `get_pricing`, `list_capabilities`, and `generate_project`.
* **Prompt Orchestration**: Before dispatching to Livepeer GPU Orchestrators, Nue Motion dynamically retrieves active learned memories and compiles them into enriched directives.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Nue Motion UI                          │
│        (Next.js 15 App Router · Tailwind CSS v4)            │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               ▼                               ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│  Python Serverless Runtime   │ │  Next.js Server API Routes   │
│  (FastAPI · api/index.py)    │ │  (/api/generate, /api/memwal)│
│  - Semantic classification   │ │  - MemWal client             │
│  - Prompt enrichment         │ │  - Walrus blob sync          │
└──────────────┬───────────────┘ └─────────────┬────────────────┘
               │                               │
               ▼                               ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│   Livepeer Agent Network     │ │      Sui Walrus MemWal       │
│   (Real-time GPU Video AI)   │ │  (Decentralized Persistence) │
└──────────────────────────────┘ └──────────────────────────────┘
```

---

## Quickstart & Local Development

### 1. Prerequisites
* **Node.js**: v20+ and `npm`
* **Python**: v3.10+ (for local FastAPI runtime)

### 2. Clone & Install
```bash
git clone https://github.com/NextMathLabs/nue.git
cd nue
npm install
pip install -r requirements.txt
```

### 3. Environment Setup
Copy the example environment file and configure your keys:
```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `LIVEPEER_API_KEY` | Livepeer API / Daydream key (optional: uses keyless $10 demo by default) |
| `MEMWAL_ACCOUNT_ID` | Sui delegate account ID for Walrus storage |
| `MEMWAL_PRIVATE_KEY` | Ed25519 private key for Sui Walrus transactions |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy App ID for email login |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL for backend database storage |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous API key |

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the landing page, or visit [http://localhost:3000/mediamemory](http://localhost:3000/mediamemory) to open the Nue Motion workspace.

---

## Deployment (Vercel)

This repository is built and structured specifically for **Vercel Serverless**:
1. Connect the repository to Vercel.
2. Vercel automatically detects the Next.js frontend and the `api/index.py` Python serverless function via `requirements.txt`.
3. Set your production environment variables in the Vercel dashboard.
4. Deploy!

---

## Track Alignment (Track 3: Innovation)

* **Centrality of Livepeer Agent**: Livepeer Agent is the core media generation engine powering video synthesis across every project.
* **Product Judgment & UX**: Stripped away all internal blockchain plumbing and raw storage blob IDs from the user interface. Creators simply direct video with an AI assistant that remembers their taste.
* **Originality**: Introduces continuous, cross-session memory to generative video workflows—solving the single biggest frustration in agentic media creation.

---

## License

MIT License — see [LICENSE](LICENSE) for details.
