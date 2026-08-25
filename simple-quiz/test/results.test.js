import assert from 'node:assert/strict';
import test from 'node:test';

import { loadResults, saveResult } from '../src/results.js';

test('saves a quiz result in the current Learner membership scope', async () => {
  const originalFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (input, init) => {
    request = new Request(new URL(input, 'http://localhost'), init);
    return new Response(null, { status: 204 });
  };
  try {
    await saveResult({
      score: 2,
      questionCount: 3,
      submittedAt: '2026-08-26T01:02:03Z',
      answers: {
        addition: '5',
        multiplication: '20',
        division: '5',
      },
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(
    request.url,
    'http://localhost/_kyozai/capabilities/database/membership/quiz_results',
  );
  assert.equal(request.method, 'PUT');
  assert.deepEqual(await request.json(), {
    key: { quiz_id: 'arithmetic' },
    values: {
      score: 2,
      question_count: 3,
      submitted_at: '2026-08-26T01:02:03Z',
      addition_answer: '5',
      multiplication_answer: '20',
      division_answer: '5',
    },
  });
});

test('loads all Learner results with one staff SQL request', async () => {
  const originalFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (input, init) => {
    request = new Request(new URL(input, 'http://localhost'), init);
    return Response.json({
      success: true,
      results: [{ membership_id: 'learner-1', score: 2 }],
    });
  };
  let results;
  try {
    results = await loadResults();
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(request.method, 'POST');
  const body = await request.json();
  assert.match(body.sql, /FROM quiz_results/);
  assert.deepEqual(body.params, ['arithmetic']);
  assert.deepEqual(results, [{ membership_id: 'learner-1', score: 2 }]);
});
