import { questionCount, scoreQuiz } from './grading.js';
import { saveResult } from './results.js';

const form = document.querySelector('#quiz');
const result = document.querySelector('#result');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const answers = Object.fromEntries(new FormData(form));
  const score = scoreQuiz(answers);
  const resultToSave = {
    score,
    questionCount,
    submittedAt: new Date().toISOString(),
    answers,
  };
  result.textContent = '結果を保存しています...';
  await saveResult(resultToSave);
  result.textContent = `${questionCount}問中${score}問正解です。結果を保存しました。`;
});
