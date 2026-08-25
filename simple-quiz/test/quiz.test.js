import assert from 'node:assert/strict';
import test from 'node:test';

import { questionCount, scoreQuiz } from '../src/grading.js';

test('scores submitted answers', () => {
  assert.equal(questionCount, 3);
  assert.equal(scoreQuiz({
    addition: '5',
    multiplication: '24',
    division: '5',
  }), 3);
  assert.equal(scoreQuiz({
    addition: '4',
    multiplication: '24',
  }), 1);
});
