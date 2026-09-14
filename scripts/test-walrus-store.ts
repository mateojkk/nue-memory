import { WalrusMemWalStore } from '../lib/nue-memory/storage/walrus-store';
import { StructuredMemory } from '../lib/nue-memory/core/types';

async function runStoreTest() {
  console.log('--- Starting WalrusMemWalStore Phase 1 Test ---');

  const store = new WalrusMemWalStore({
    namespace: 'nue-test-suite',
  });

  await store.initialize();
  console.log('✓ Store initialized successfully');

  const sampleMemory: StructuredMemory = {
    id: 'mem-test-01',
    userId: 'agent_user_42',
    type: 'preference',
    category: 'visual_style',
    value: 'Prefers bright, minimalist interfaces with warm bronze accents',
    confidence: 0.95,
    scope: 'global',
    domain: 'media',
    source: {
      type: 'user_feedback',
      eventContext: 'Feedback on v1 video review',
      timestamp: new Date().toISOString(),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isActive: true,
  };

  // Test 1: Save
  const saveResult = await store.save(sampleMemory);
  console.log('✓ Saved memory with blob ID:', saveResult.blobId);
  if (!saveResult.blobId) {
    throw new Error('Save failed: missing blobId');
  }

  // Test 2: Get by ID
  const retrieved = await store.get('mem-test-01');
  console.log('✓ Retrieved memory by ID:', retrieved?.value);
  if (retrieved?.id !== 'mem-test-01' || retrieved?.confidence !== 0.95) {
    throw new Error('Get failed: data mismatch');
  }

  // Test 3: Semantic Search
  const searchResults = await store.search({
    query: 'What visual style does the user like?',
    userId: 'agent_user_42',
    domain: 'media',
  });
  console.log(`✓ Search returned ${searchResults.length} result(s)`);
  if (searchResults.length === 0) {
    throw new Error('Search failed: expected at least 1 result');
  }
  console.log('  Top match:', searchResults[0].memory.value, `(Rank score: ${searchResults[0].rankScore.toFixed(3)})`);

  // Test 4: Update
  const updated = await store.update('mem-test-01', {
    value: 'Prefers high-key minimalist visuals with muted bronze',
    confidence: 0.98,
  });
  console.log('✓ Updated memory value:', updated?.value);
  if (updated?.confidence !== 0.98) {
    throw new Error('Update failed');
  }

  // Test 5: Delete
  const deleted = await store.delete('mem-test-01');
  console.log('✓ Deleted memory result:', deleted);
  const afterDelete = await store.get('mem-test-01');
  if (afterDelete !== null) {
    throw new Error('Delete failed: memory still retrievable');
  }

  console.log('--- All WalrusMemWalStore tests passed cleanly! ---');
}

runStoreTest().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
