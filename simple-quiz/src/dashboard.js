import { loadResults } from './results.js';

const [learnersResponse, results] = await Promise.all([
  fetch('/_kyozai/capabilities/course/learners'),
  loadResults(),
]);
if (!learnersResponse.ok) {
  throw new Error(`learners request failed: ${learnersResponse.status}`);
}
const learners = await learnersResponse.json();
const resultsByMembership = new Map(
  results.map((result) => [result.membership_id, result]),
);

const status = document.querySelector('#status');
const table = document.querySelector('table');
const body = document.querySelector('tbody');
for (const learner of learners) {
  const result = resultsByMembership.get(learner.membershipId);
  body.append(result === undefined
    ? row(learner.displayName, '未提出', '—', '—', '—', '—', '—', '—')
    : row(
      learner.displayName,
      `${result.score} / ${result.question_count}`,
      result.addition_answer ?? '—',
      result.multiplication_answer ?? '—',
      result.division_answer ?? '—',
      result.subtraction_answer ?? '—',
      result.halving_answer ?? '—',
      new Date(result.submitted_at).toLocaleString('ja-JP'),
    ));
}
status.hidden = true;
table.hidden = false;

function row(...values) {
  const element = document.createElement('tr');
  for (const value of values) {
    const cell = document.createElement('td');
    cell.textContent = value;
    element.append(cell);
  }
  return element;
}
