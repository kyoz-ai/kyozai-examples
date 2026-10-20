import { ADVICE, shownAdvice } from './site/advice.js';

const PROGRESS_URL = '/_kyozai/capabilities/database/membership/notebook_progress';
const EXECUTIONS_URL = '/_kyozai/capabilities/database/membership/cell_executions';
const DECISION_URL = '/_kyozai/capabilities/decision';
const MAX_TRACEBACK_CHARS = 4000;

export async function saved(model) {
  if (model.type !== 'notebook') {
    return;
  }
  const codeCells = model.content.cells.filter((cell) => cell.cell_type === 'code');
  await mutate(PROGRESS_URL, 'PUT', {
    key: { path: model.path },
    values: {
      last_modified: model.last_modified,
      code_cells: codeCells.length,
      executed_code_cells: codeCells.filter((cell) => cell.execution_count !== null).length,
    },
  });
}

export async function removed(model) {
  if (model.type !== 'notebook') {
    return;
  }
  await mutate(PROGRESS_URL, 'DELETE', { key: { path: model.path } });
}

export async function executed(model, execution) {
  const { cell, success } = execution;
  const error = cell.outputs.find((output) => output.output_type === 'error');
  const advice = error === undefined ? null : await selectAdvice(cell, error);
  await mutate(EXECUTIONS_URL, 'PUT', {
    key: { path: model.path, cell_id: cell.id, executed_at: new Date().toISOString() },
    values: {
      execution_count: cell.execution_count,
      success,
      error: error === undefined ? null : `${error.ename}: ${error.evalue}\n${error.traceback.join('\n')}`,
      advice_id: advice === null ? null : advice.id,
      advice_probability: advice === null ? null : advice.probability,
    },
  });
  if (advice === null) {
    return;
  }
  const text = shownAdvice(advice.id, advice.probability);
  return text === null ? undefined : { text };
}

async function selectAdvice(cell, error) {
  const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
  const traceback = error.traceback.join('\n').replace(/\x1b\[[0-9;]*m/g, '');
  const response = await fetch(DECISION_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      state: `# Code\n${source}\n\n# Error\n${error.ename}: ${error.evalue}\n${traceback.slice(-MAX_TRACEBACK_CHARS)}`,
      questions: {
        advice: {
          type: 'choice',
          instructions: '受講者のcodeとエラーの原因に最も当てはまる説明はどれか',
          criteria: Object.fromEntries(ADVICE.map((candidate) => [candidate.id, candidate.criteria])),
        },
      },
    }),
  });
  if (!response.ok) {
    throw new Error(`${DECISION_URL}: ${response.status}`);
  }
  const { answers } = await response.json();
  return { id: answers.advice.choice, probability: answers.advice.probabilities[answers.advice.choice] };
}

async function mutate(url, method, body) {
  const response = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`${url}: ${response.status}`);
  }
}
