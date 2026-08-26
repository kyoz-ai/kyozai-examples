import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('publishes the static application from dist', async () => {
  const manifest = JSON.parse(
    await readFile(new URL('../kyozai.json', import.meta.url), 'utf8'),
  );
  const document = await readFile(
    new URL('../src/index.html', import.meta.url),
    'utf8',
  );

  assert.equal(manifest.artifacts.assets, 'dist');
  assert.deepEqual(manifest.capabilities, ['application-database']);
  assert.deepEqual(manifest.database, {
    migrations: [
      'migrations/001-quiz-results.sql',
      'migrations/002-quiz-answers.sql',
      'migrations/003-five-question-answers.sql',
    ],
    tables: {
      quiz_results: { scope: 'membership', key: ['quiz_id'] },
    },
  });
  assert.match(document, /<script type="module" src="\/entry\.js"><\/script>/);
});
