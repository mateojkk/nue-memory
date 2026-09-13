import { nue } from '../lib/nue-memory/sdk';

async function testSdk() {
  console.log('=== Testing Nue Memory Developer SDK ===\n');

  // Check Walrus Health
  const health = await nue.health();
  console.log(`✓ Relayer Health: ${health.status} (version ${health.version}, mode: ${health.mode || 'standard'})`);

  // Step 1: Ingest conversation messages
  console.log('\n--- Step 1: nue.add(messages) ---');
  const addResult = await nue.add([
    { role: 'user', content: 'The intro is too slow. Make the captions much larger and remove the dramatic music.' },
  ], {
    userId: 'dev_user_01',
    domain: 'media',
    sessionContext: 'Interactive feedback session',
  });

  console.log(`Classification: ${addResult.classification}`);
  console.log(`Extracted & Stored: ${addResult.extractedCount} memories`);
  addResult.memories.forEach((m) => {
    console.log(`  * [${m.category}] ${m.value} (confidence: ${m.confidence}, blob: ${m.storageBlobId})`);
  });

  if (addResult.extractedCount < 3) {
    throw new Error('SDK add failed to extract and persist candidates');
  }

  // Step 2: Search for preferences
  console.log('\n--- Step 2: nue.search(query) ---');
  const searchResults = await nue.search('What are the typography and audio preferences?', {
    userId: 'dev_user_01',
    domain: 'media',
  });
  console.log(`Found ${searchResults.length} relevant memory(ies):`);
  searchResults.forEach((m) => {
    console.log(`  * [${m.category}] ${m.value}`);
  });

  // Step 3: Get ready-to-inject Agent Context Block
  console.log('\n--- Step 3: nue.getContext(prompt) ---');
  const context = await nue.getContext('Create a new product promo', {
    userId: 'dev_user_01',
    domain: 'media',
  });
  console.log('Injected Context Block:');
  console.log(context.injectedContextBlock);

  // Step 4: Evolution - User switches style
  console.log('--- Step 4: Evolve / Contradiction handling ---');
  const evolveResult = await nue.add([
    { role: 'user', content: 'From now on, I want gentle, cinematic pacing.' },
  ], {
    userId: 'dev_user_01',
    domain: 'media',
  });

  console.log(`Evolve action registered: ${evolveResult.evolutionPlans.length} plan(s)`);
  evolveResult.evolutionPlans.forEach((p) => {
    console.log(`  * Action: ${p.action} -> ${p.reason}`);
  });

  // Search again: only active cinematic pacing should be retrieved, fast pacing should be superseded
  const updatedSearch = await nue.search('pacing', {
    userId: 'dev_user_01',
    domain: 'media',
  });
  console.log(`Active pacing memories: ${updatedSearch.length}`);
  updatedSearch.forEach((m) => {
    console.log(`  * [${m.category}] ${m.value} (isActive: ${m.isActive})`);
  });

  if (!updatedSearch[0]?.value.toLowerCase().includes('cinematic')) {
    throw new Error('Expected newer cinematic preference to supersede older fast pacing');
  }

  console.log('\n=== All Nue Memory SDK Developer API Tests Passed! ===');
}

testSdk().catch((err) => {
  console.error('SDK test failed:', err);
  process.exit(1);
});
