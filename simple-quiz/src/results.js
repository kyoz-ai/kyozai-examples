const database = '/_kyozai/capabilities/database';

export const quizId = 'arithmetic';

export async function saveResult(result) {
  const response = await fetch(`${database}/membership/quiz_results`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      key: { quiz_id: quizId },
      values: {
        score: result.score,
        question_count: result.questionCount,
        submitted_at: result.submittedAt,
        addition_answer: result.answers.addition,
        multiplication_answer: result.answers.multiplication,
        division_answer: result.answers.division,
        subtraction_answer: result.answers.subtraction,
        halving_answer: result.answers.halving,
      },
    }),
  });
  if (!response.ok) {
    throw new Error(`result save failed: ${response.status}`);
  }
}

export async function loadResults() {
  const response = await fetch(`${database}/sql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      sql: `SELECT membership_id, score, question_count, submitted_at,
                   addition_answer, multiplication_answer, division_answer,
                   subtraction_answer, halving_answer
            FROM quiz_results
            WHERE quiz_id = ?`,
      params: [quizId],
    }),
  });
  if (!response.ok) {
    throw new Error(`results request failed: ${response.status}`);
  }
  const body = await response.json();
  return body.results;
}
