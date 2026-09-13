import { WalrusMemWalStore } from '../lib/nue-memory/storage/walrus-store';
import { extractMemories, candidateToStructuredMemory } from '../lib/nue-memory/engine/extractor';
import { planMemoryEvolution } from '../lib/nue-memory/engine/evolution';
import { formatAgentContext } from '../lib/nue-memory/engine/retrieval';
import { StructuredMemory } from '../lib/nue-memory/core/types';

async function runPhase2Test() {
  console.log('=== Starting Phase 2: Core Nue Memory Engine Tests ===\n');

  // ----------------------------------------------------------------------
  // Test 1: Distinguishing Temporary Edits from Persistent Preferences
  // ----------------------------------------------------------------------
  console.log('--- Test 1: Temporary vs Persistent Classification ---');

  const tempInput = 'Make this video 5 seconds shorter at second 4.';
  const tempResult = extractMemories(tempInput);
  console.log(`Input: "${tempInput}"`);
  console.log(`-> Classification: ${tempResult.classification}`);
  console.log(`-> Candidate count: ${tempResult.candidates.length}`);
  if (tempResult.classification !== 'temporary_edit') {
    throw new Error(`Expected temporary_edit, got ${tempResult.classification}`);
  }

  const persistentInput = 'The intro is too slow. Make the captions much larger and remove the dramatic music.';
  const persistentResult = extractMemories(persistentInput);
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
  const store = new WalrusMemWalStore({ namespace: 'phase2-test-ns', forceMock: true });
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
  // Test 3: Conflict Detection & Memory Evolution (Dark Mode -> Light Mode)
  // ----------------------------------------------------------------------
  console.log('--- Test 3: Conflict Evolution (Contradiction Supersession) ---');

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

  // Later preference: Switched to Light Mode!
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

  const existingInStore = await store.list({ userId: 'test_agent_user' });
  const evolutionPlan = planMemoryEvolution(existingInStore, newCandidate);

  console.log(`Evolution Plan Action: "${evolutionPlan.action}"`);
  console.log(`Reason: ${evolutionPlan.reason}`);
  console.log(`Memories to deactivate: ${evolutionPlan.memoriesToDeactivate.length}`);

  if (evolutionPlan.action !== 'supersede') {
    throw new Error(`Expected evolution action "supersede", got "${evolutionPlan.action}"`);
  }

  // Apply evolution to store
  for (const deact of evolutionPlan.memoriesToDeactivate) {
    await store.update(deact.id, {
      isActive: false,
      supersededById: evolutionPlan.memoryToPersist.id,
    });
  }
  await store.save(evolutionPlan.memoryToPersist);

  // Verify that the old memory is now inactive and linked
  const oldMemoryAfter = await store.get('mem-theme-01');
  const newMemoryAfter = await store.get('mem-theme-02');

  console.log(`Older memory isActive: ${oldMemoryAfter?.isActive} (supersededById: ${oldMemoryAfter?.supersededById})`);
  console.log(`Newer memory isActive: ${newMemoryAfter?.isActive} (supersedesId: ${newMemoryAfter?.supersedesId})`);

  if (oldMemoryAfter?.isActive !== false || oldMemoryAfter?.supersededById !== 'mem-theme-02') {
    throw new Error('Supersession failed on older memory');
  }
  if (newMemoryAfter?.supersedesId !== 'mem-theme-01') {
    throw new Error('Supersession link missing on newer memory');
  }
  console.log('✓ Test 3 Passed: Conflict evolution correctly superseded contradictory memory.\n');

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

  // Verify that the superseded Dark Mode memory is NOT retrieved
  const foundDeactivated = searchResults.some((r) => r.memory.id === 'mem-theme-01');
  if (foundDeactivated) {
    throw new Error('Retrieval error: Superseded memory was returned in active search results!');
  }

  // Format into agent context block
  const agentContext = formatAgentContext(searchResults);
  console.log('\nGenerated Agent Prompt Injection Block:');
  console.log(agentContext.injectedContextBlock);

  if (agentContext.totalRetrieved === 0) {
    throw new Error('Expected retrieved context items');
  }

  console.log('✓ Test 4 Passed: Context retrieved, ranked, and injected without superseded records.\n');

  console.log('=== All Phase 2 Core Nue Memory Engine Tests PASSED Successfully! ===');
}

runPhase2Test().catch((err) => {
  console.error('Phase 2 test failed:', err);
  process.exit(1);
});
