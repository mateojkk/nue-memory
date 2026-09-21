import { WalrusMemWalStore } from '../lib/nue-memory/storage/walrus-store';
import { extractMemories, candidateToStructuredMemory } from '../lib/nue-memory/engine/extractor';
import { formatAgentContext } from '../lib/nue-memory/engine/retrieval';
import { StructuredMemory } from '../lib/nue-memory/core/types';

async function runPhase2Test() {
  console.log('=== Starting Phase 2: Core Nue Memory Engine Tests ===\n');

  // ----------------------------------------------------------------------
  // Test 1: Distinguishing Temporary Edits from Persistent Preferences
  // ----------------------------------------------------------------------
  console.log('--- Test 1: Temporary vs Persistent Classification ---');

  const tempInput = 'Make this video 5 seconds shorter at second 4.';
  const tempResult = await extractMemories(tempInput);
  console.log(`Input: "${tempInput}"`);
  console.log(`-> Classification: ${tempResult.classification}`);
  console.log(`-> Candidate count: ${tempResult.candidates.length}`);
  if (tempResult.classification !== 'temporary_edit') {
    throw new Error(`Expected temporary_edit, got ${tempResult.classification}`);
  }

  const persistentInput = 'The intro is too slow. Make the captions much larger and remove the dramatic music.';
  const persistentResult = await extractMemories(persistentInput);
  console.log(`\nInput: "${persistentInput}"`);
  console.log(`-> Classification: ${persistentResult.classification}`);
  console.log(`-> Extracted ${persistentResult.candidates.length} candidate(s):`);
  persistentResult.candidates.forEach((c) => {
    console.log(`   * [${c.category.toUpperCase()}]: ${c.value} (confidence: ${c.confidence})`);
  });

  if (persistentResult.candidates.length < 3) {
    throw new Error(`Expected at least 3 candidates (pacing, typography, audio), got ${persistentResult.candidates.length}`);
  }
  console.log('✓ Test 1 Passed: Correctly distinguished temporary edits from durable preferences.\n');

  // ----------------------------------------------------------------------
  // Test 2: Storage & Ingestion with Walrus MemWal
  // ----------------------------------------------------------------------
  console.log('--- Test 2: Ingest & Persist to Walrus MemWal ---');
  const store = new WalrusMemWalStore({ namespace: 'phase2-test-ns' });
  await store.initialize();

  const savedMemories: StructuredMemory[] = [];
  for (const candidate of persistentResult.candidates) {
    const memoryObj = candidateToStructuredMemory(candidate, {
      userId: 'test_agent_user',
      domain: 'media',
      projectId: 'proj_alpha',
    });
    const { blobId, memory } = await store.save(memoryObj);
    savedMemories.push(memory);
    console.log(`✓ Stored memory: [${memory.category}] -> Walrus Blob [${blobId}]`);
  }
  console.log('✓ Test 2 Passed: Memories persisted through Walrus MemWal adapter.\n');

  // ----------------------------------------------------------------------
  // Test 3: ADD-only Contradiction Handling (Dark Mode -> Light Mode)
  // ----------------------------------------------------------------------
  console.log('--- Test 3: ADD-only history (contradiction preserved, newest wins ranking) ---');

  // Initial preference: Dark Mode
  const initialMem: StructuredMemory = {
    id: 'mem-theme-01',
    userId: 'test_agent_user',
    type: 'preference',
    category: 'visual_style',
    value: 'User prefers dark mode interfaces with deep black canvases',
    confidence: 0.90,
    scope: 'global',
    domain: 'media',
    source: { type: 'explicit_statement', timestamp: '2026-09-01T10:00:00Z' },
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z',
    isActive: true,
  };
  await store.save(initialMem);
  console.log(`Initial Memory registered: "${initialMem.value}" (isActive: ${initialMem.isActive})`);

  // Later preference: Switched to Light Mode! Appended as a new fact -
  // nothing is overwritten or deactivated.
  const newCandidate: StructuredMemory = {
    id: 'mem-theme-02',
    userId: 'test_agent_user',
    type: 'preference',
    category: 'visual_style',
    value: 'I have switched to light mode interfaces with warm white canvases',
    confidence: 0.95,
    scope: 'global',
    domain: 'media',
    source: { type: 'explicit_statement', timestamp: '2026-09-13T12:00:00Z' },
    createdAt: '2026-09-13T12:00:00Z',
    updatedAt: '2026-09-13T12:00:00Z',
    isActive: true,
  };
  await store.save(newCandidate);

  // Both records stay active: history is preserved, ranking resolves.
  const oldMemoryAfter = await store.get('mem-theme-01');
  const newMemoryAfter = await store.get('mem-theme-02');

  console.log(`Older memory isActive: ${oldMemoryAfter?.isActive}`);
  console.log(`Newer memory isActive: ${newMemoryAfter?.isActive}`);

  if (oldMemoryAfter?.isActive !== true || newMemoryAfter?.isActive !== true) {
    throw new Error('ADD-only violated: a contradictory memory was deactivated');
  }
  console.log('✓ Test 3 Passed: Contradictory memories coexist as history.\n');

  // ----------------------------------------------------------------------
  // Test 4: Retrieval, Ranking & Context Injection for Next Project
  // ----------------------------------------------------------------------
  console.log('--- Test 4: Semantic Retrieval & Agent Context Injection ---');

  // In project 2, user asks: "Create a launch promo for my new product."
  const project2Prompt = 'Create a launch promo for my new product.';
  const searchResults = await store.search({
    query: project2Prompt,
    userId: 'test_agent_user',
    domain: 'media',
  });

  console.log(`Retrieved ${searchResults.length} relevant active memory(ies) for "${project2Prompt}":`);
  searchResults.forEach((r, idx) => {
    console.log(`  ${idx + 1}. [${r.memory.category.toUpperCase()}] ${r.memory.value} (rankScore: ${r.rankScore.toFixed(3)})`);
  });

  // ADD-only: if both theme memories surface, the newer one must rank first
  // (recency-weighted ranking resolves contradictions at read time).
  const themeRank = (id: string) => searchResults.findIndex((r) => r.memory.id === id);
  const oldIdx = themeRank('mem-theme-01');
  const newIdx = themeRank('mem-theme-02');
  if (oldIdx !== -1 && newIdx !== -1 && !(newIdx < oldIdx)) {
    throw new Error('Retrieval error: newer contradictory memory did not outrank the older one.');
  }
  console.log('✓ Newest contradictory memory outranks the older one (or older absent).');

  // Format into agent context block
  const agentContext = formatAgentContext(searchResults);
  console.log('\nGenerated Agent Prompt Injection Block:');
  console.log(agentContext.injectedContextBlock);

  if (agentContext.totalRetrieved === 0) {
    throw new Error('Expected retrieved context items');
  }

  console.log('✓ Test 4 Passed: Context retrieved, ranked, and injected with history preserved.\n');

  console.log('=== All Phase 2 Core Nue Memory Engine Tests PASSED Successfully! ===');
}

runPhase2Test().catch((err) => {
  console.error('Phase 2 test failed:', err);
  process.exit(1);
});
