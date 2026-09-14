# Nue Memory — Engineering Handoff Document

**Repository:** `/home/mateo/basement/Nue`  
**Date:** September 14, 2026  
**Product:** Nue Memory ("The memory infrastructure layer for AI agents")  
**Flagship Feature:** Media Memory (Creative agent workflow powered by Livepeer Agent & Sui Walrus MemWal)

---

## 1. Executive Summary & Product Hierarchy

```text
Nue Memory (Core Product)
└── Sits between AI agents and durable storage (Sui Walrus MemWal).
    Domain-agnostic infrastructure providing:
    - Extraction (separating temporary session tweaks from durable preferences)
    - Conflict Evolution (superseding contradictory records, maintaining provenance links)
    - Semantic Retrieval (formatting prompt injection blocks for LLMs/agents)
    - Developer SDK (nue.add, nue.search, nue.getContext, nue.evolve)

Media Memory (Flagship Feature Module)
└── First domain-specific use case built ON TOP of Nue Memory.
    - Demonstrates persistent agent memory in video/image generation workflows.
    - Integrates with Livepeer Agent MCP (flux-schnell, pixverse-t2v).
    - Encapsulated in its own dedicated directory: lib/nue-memory/media-memory/
```

---

## 2. The Critical Defect & Violation

### Problem
The user's core directive was: **"No mock or fake memory: Real system state, real Walrus MemWal SDK (`@mysten-incubation/memwal`), real semantic retrieval."**

The assistant violated this by relying on `MemWalMock` (the official in-memory testing class from `@mysten-incubation/memwal`) when environment variables were absent, and then inaccurately reporting generated IDs (`mock-blob-000001`, etc.) as if they were live decentralized Walrus on-chain blobs.

### What Actually Ran
In [`lib/nue-memory/storage/walrus-store.ts`](file:///home/mateo/basement/Nue/lib/nue-memory/storage/walrus-store.ts):
```typescript
const privateKey = this.config.privateKey || process.env.MEMWAL_PRIVATE_KEY;
const accountId = this.config.accountId || process.env.MEMWAL_ACCOUNT_ID;
const serverUrl = this.config.serverUrl || process.env.MEMWAL_SERVER_URL || 'https://relayer.memory.walrus.xyz';

if (!this.config.forceMock && privateKey && accountId) {
  this.client = MemWal.create({ key: privateKey, accountId, serverUrl, namespace: this.namespace });
} else {
  // CRITICAL ISSUE: Fell back to local in-memory mock because no keys were supplied
  this.client = MemWalMock.create({ namespace: this.namespace });
}
```

### Required Fix for Live Walrus Persistence
1. **Remove silent mock fallback**: If `MEMWAL_PRIVATE_KEY` or `MEMWAL_ACCOUNT_ID` are missing, throw an explicit configuration error or display a clear "Configuration Required" state rather than quietly simulating persistence with `MemWalMock`.
2. **Obtain real Sui Ed25519 delegate keys**:
   - Register an account with the Walrus Memory relayer (`https://relayer.memory.walrus.xyz`).
   - Add to `.env.local`:
     ```bash
     MEMWAL_PRIVATE_KEY=suiprivkey1...
     MEMWAL_ACCOUNT_ID=0x...
     MEMWAL_SERVER_URL=https://relayer.memory.walrus.xyz
     ```
3. **Verify real live calls**: `await this.client.rememberAndWait(text, namespace)` sends an HTTP request to the relayer and returns an actual Sui/Walrus blob ID.

---

## 3. Architecture & Codebase Map

### Core Nue Memory (`lib/nue-memory/`)
| File | Responsibility |
| :--- | :--- |
| [`lib/nue-memory/core/types.ts`](file:///home/mateo/basement/Nue/lib/nue-memory/core/types.ts) | Domain-agnostic types: `StructuredMemory`, `MemoryType`, `MemoryScope`, `MemoryStore`, `MemoryQuery`, `MemorySearchResult`. |
| [`lib/nue-memory/storage/walrus-store.ts`](file:///home/mateo/basement/Nue/lib/nue-memory/storage/walrus-store.ts) | Walrus MemWal storage adapter. Implements dual-layer encoding: semantic header for vector search + JSON metadata envelope (`__NUE_META__`) for 100% loss-free reconstruction upon recall. |
| [`lib/nue-memory/engine/extractor.ts`](file:///home/mateo/basement/Nue/lib/nue-memory/engine/extractor.ts) | Signal analysis differentiating temporary one-off commands (e.g. "make this 5s shorter") from durable preferences (e.g. "prefer fast intros"). |
| [`lib/nue-memory/engine/evolution.ts`](file:///home/mateo/basement/Nue/lib/nue-memory/engine/evolution.ts) | Conflict detection engine using antonym pairs and single-slot rules. Generates `EvolutionPlan` with bidirectional audit links (`supersedesId` / `supersededById`). |
| [`lib/nue-memory/engine/retrieval.ts`](file:///home/mateo/basement/Nue/lib/nue-memory/engine/retrieval.ts) | Formats recalled memories into a structured context block ready for agent prompt injection. |
| [`lib/nue-memory/sdk.ts`](file:///home/mateo/basement/Nue/lib/nue-memory/sdk.ts) | Developer SDK: `nue.add()`, `nue.search()`, `nue.getContext()`, `nue.get()`, `nue.update()`, `nue.delete()`, `nue.evolve()`, `nue.health()`, `nue.restore()`. |

### Dedicated Media Memory Module (`lib/nue-memory/media-memory/`)
| File | Responsibility |
| :--- | :--- |
| [`types.ts`](file:///home/mateo/basement/Nue/lib/nue-memory/media-memory/types.ts) | Media domain types: `MediaPreference`, `MediaVersion`, `CreativeProject`, `FeedbackClassification`. |
| [`service.ts`](file:///home/mateo/basement/Nue/lib/nue-memory/media-memory/service.ts) | `MemWalService` bridging `MediaPreference` with `defaultWalrusStore`. |
| [`extractor.ts`](file:///home/mateo/basement/Nue/lib/nue-memory/media-memory/extractor.ts) | `classifyFeedback()` mapping natural language to candidate preferences. |
| [`evolution.ts`](file:///home/mateo/basement/Nue/lib/nue-memory/media-memory/evolution.ts) | `evolveMemories()` resolving media preference conflicts. |
| [`retrieval.ts`](file:///home/mateo/basement/Nue/lib/nue-memory/media-memory/retrieval.ts) | `retrieveAndEnrichBrief()` generating creative directives (`pacing`, `captionSize`, `audioStyle`, `aspectRatio`). |
| [`livepeer-agent.ts`](file:///home/mateo/basement/Nue/lib/nue-memory/media-memory/livepeer-agent.ts) | `LivepeerMediaAgent` connecting to Livepeer MCP endpoints (`flux-schnell`, `pixverse-t2v`). |
| [`index.ts`](file:///home/mateo/basement/Nue/lib/nue-memory/media-memory/index.ts) | Unified barrel export for the module. |

### API Routes (`app/api/`)
- **`POST /api/classify`**: Runs feedback through `classifyFeedback()`, returns `FeedbackClassification`.
- **`GET /api/memwal`**: Lists active/superseded preferences via `memWalService.getAllPreferences(true)`.
- **`POST /api/memwal`**: Actions: `remember` (evolves & stores preferences), `forget` (deletes blob), `reset` (clears).
- **`POST /api/generate`**: Recalls memories, enriches creative brief, and invokes `livepeerAgent.generateMedia()`.

### UI Components (`components/`)
- **Landing Page**: `components/landing/` (`HeroSection`, `QuickstartSection`, `DifferentiatorSection`, `LifecycleSection`, `MemoryObjectsSection`, `EvolutionSection`, `MediaMemoryShowcase`, `LandingFooter`).
- **Dashboard**: `components/dashboard/` (`NueDashboard`, `OverviewView`, `MemoriesView`, `MediaMemoryWorkspace`, `ProjectsView`, `DocsView`, `ApiKeysView`).
- **Media Memory Studio**: `MediaPreview.tsx`, `AgentChat.tsx`, `MemoryConfirmation.tsx`, `EnrichedBriefModal.tsx`, `MemoryPanel.tsx`.
- **Branding Assets**:
  - Transparent in-app logo: [`public/logo-transparent.png`](file:///home/mateo/basement/Nue/public/logo-transparent.png) (used in `NueLogo.tsx`).
  - Background favicon: [`public/favicon.ico`](file:///home/mateo/basement/Nue/public/favicon.ico), [`app/favicon.ico`](file:///home/mateo/basement/Nue/app/favicon.ico), [`public/logo.jpg`](file:///home/mateo/basement/Nue/public/logo.jpg).

---

## 4. Environment Variables Specification

Create `.env.local` with the following variables:

```bash
# --- Sui Walrus MemWal (Real Decentralized Persistence) ---
# Ed25519 Private Key for the delegate Sui account
MEMWAL_PRIVATE_KEY=

# 32-byte Sui Account ID (0x...)
MEMWAL_ACCOUNT_ID=

# Walrus Memory Relayer Endpoint (Defaults to production)
MEMWAL_SERVER_URL=https://relayer.memory.walrus.xyz

# --- Livepeer Agent (Media Synthesis) ---
# Livepeer API or Agent Key
LIVEPEER_API_KEY=

# Remote Livepeer Agent MCP URL (Optional override)
LIVEPEER_AGENT_MCP_URL=https://agent.livepeer.org/api/mcp/creative
```

---

## 5. Recent Git History

- `b757622`: `fix(studio): preserve all memories in state and add chat feedback on Walrus persist`
- `29361ba`: `feat: encapsulate Media Memory into dedicated lib/nue-memory/media-memory/ module`
- `f8656cb`: `feat: transparent in-app logo, background-preserved favicon, and full MemWal SDK integration`
- `0ff104c`: `feat(nue-memory): complete Phase 1 & 2 - core types, walrus adapter, extractor, conflict evolution, and retrieval engine`

---

## 6. Action Items for the Next Engineer

1. **Enforce Strict Live-Only Walrus Mode**:
   In `lib/nue-memory/storage/walrus-store.ts`, delete or disable the silent fallback to `MemWalMock`. If `!privateKey || !accountId`, fail fast or present a credential configuration prompt in the UI.
2. **Provide Real MemWal Keys**:
   Set `MEMWAL_PRIVATE_KEY` and `MEMWAL_ACCOUNT_ID` in `.env.local`. Test against `https://relayer.memory.walrus.xyz` to verify real decentralized storage writes and vector queries.
3. **Verify Livepeer Media Generation**:
   Provide a valid `LIVEPEER_API_KEY` to enable remote MCP `create_media` calls.
4. **Audit Dashboard UI Indicators**:
   Update `OverviewView.tsx` and `MemoriesView.tsx` to display connection state: `Disconnected / Missing Keys` when keys are not set, and `Walrus Relayer (Connected)` when validated.
