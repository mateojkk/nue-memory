/**
 * Verifies the prompt-sanitizer and policy-detection helpers that break the
 * "Ready to roll take 2?" retry loop.
 *
 * Why this exists: ByteDance's partner safety scanner refuses a video render when the
 * visual prompt contains quoted lyric or dialogue text (`partner_validation_failed` /
 * `content_policy_violation`). Re-dispatching the identical prompt reproduces the
 * identical rejection, so a retry only means anything if the payload actually changes.
 * These checks pin that behaviour down.
 *
 * Usage:
 *   npx tsx scripts/verify-prompt-sanitizer.ts
 */
import {
  stripLyricTextFromVideoPrompt,
  simplifyVideoPromptForRetry,
  isPolicyRejection,
  sanitizePromptForDiffusion,
} from '../lib/ai/nue-director';

let failures = 0;

function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) {
    console.log(`      expected: ${JSON.stringify(expected)}`);
    console.log(`      actual  : ${JSON.stringify(actual)}`);
  }
}

function checkThat(name: string, cond: boolean, detail?: string) {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? `  -> ${detail}` : ''}`);
}

console.log('--- stage 1: stripLyricTextFromVideoPrompt ---');

// The exact failure mode: the director echoes the user's own lyrics into the video prompt.
// The fixture lyrics are deliberately original, so the repo never ships copyrighted text.
const lyrics = 'The lantern burns both night and day\nAbove the harbor far away';
const echoed =
  'A sleepy harbor town at dawn. The lantern burns both night and day Above the harbor far away while gulls circle. Warm golden light, shallow depth of field.';

check(
  'echoed user lyric lines are removed',
  stripLyricTextFromVideoPrompt(echoed, lyrics),
  'A sleepy harbor town at dawn. while gulls circle. Warm golden light, shallow depth of field.'
);
checkThat(
  'no lyric fragment survives',
  !stripLyricTextFromVideoPrompt(echoed, lyrics).includes('lantern')
);

check(
  'long quoted dialogue block is removed',
  stripLyricTextFromVideoPrompt(
    'A chef smiles. He says "welcome to my little kitchen today my friends" and plates the dish.'
  ),
  'A chef smiles. He says and plates the dish.'
);

// A short quoted on-screen label is a legitimate visual element and must survive.
check(
  'short quoted on-screen label is preserved',
  stripLyricTextFromVideoPrompt('A neon sign reading "NUE" glows above the doorway.'),
  'A neon sign reading "NUE" glows above the doorway.'
);

check(
  'curly-quoted long block is removed',
  stripLyricTextFromVideoPrompt('A child dances. \u201cthe lantern burns both night and day\u201d then skips away.'),
  'A child dances. then skips away.'
);

checkThat('empty prompt is safe', stripLyricTextFromVideoPrompt('') === '');

console.log('\n--- stage 2: simplifyVideoPromptForRetry ---');

const stage1Out = stripLyricTextFromVideoPrompt(echoed, lyrics);
const stage2Out = simplifyVideoPromptForRetry(stage1Out);

// Design note: if stage 1 already removed every quoted block, stage 2 has nothing left to
// change, so the guard in the route correctly SKIPS the retry. Re-dispatching an identical
// prompt is what produced the loop in the first place.
checkThat(
  'stage 2 equals stage 1 when stage 1 already removed all quoted text (retry then skipped by design)',
  stage2Out === stage1Out,
  `stage1=${JSON.stringify(stage1Out)} stage2=${JSON.stringify(stage2Out)}`
);

check(
  'stage 2 removes audio-direction clauses',
  simplifyVideoPromptForRetry(
    'A fishing boat drifts across the harbor as the music swells joyfully and the soundtrack fades out.'
  ),
  'A fishing boat drifts across the harbor.'
);

// This is the case where the retry MUST fire: stage 1 keeps a short quoted label, the
// scanner refuses anyway, and stage 2 produces a genuinely different payload.
const shortLabel = 'A neon sign reading "NUE" glows above the doorway.';
checkThat(
  'stage 2 differs from stage 1 when a short quoted label remains (retry fires)',
  stripLyricTextFromVideoPrompt(shortLabel) === shortLabel &&
    simplifyVideoPromptForRetry(shortLabel) !== shortLabel
);

check(
  'stage 2 removes every quoted block including short ones',
  simplifyVideoPromptForRetry(shortLabel),
  'A neon sign reading glows above the doorway.'
);

console.log('\n--- isPolicyRejection ---');
for (const sample of [
  'partner_validation_failed: content_policy_violation',
  'rejected due to a potential copyright issue',
  'copyright violation detected',
  'policy_violation',
]) {
  checkThat(`detects policy rejection: ${sample.slice(0, 40)}`, isPolicyRejection(sample));
}
for (const sample of [
  'Input validation error: arguments did not match the tool schema. `duration` must be at most 15.',
  'Livepeer HTTP failure: 502',
  'No media URL or job ID returned by Livepeer',
  '',
]) {
  checkThat(
    `does NOT treat as policy rejection: ${sample.slice(0, 40) || '(empty)'}`,
    !isPolicyRejection(sample)
  );
}

console.log('\n--- regression: sanitizePromptForDiffusion still strips duration phrasing ---');
checkThat(
  'duration phrasing is still stripped from the prompt',
  !/\b30\s*second/i.test(sanitizePromptForDiffusion('Create a 30 second video of a lighthouse at dusk.'))
);

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
