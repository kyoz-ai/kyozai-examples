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
  const advice = error === undefined ? null : await selectAdvice(model, cell, error);
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

async function selectAdvice(model, cell, error) {
  const traceback = error.traceback.join('\n').replace(/\x1b\[[0-9;]*m/g, '');
  const response = await fetch(DECISION_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      state: `# Code\n${cellSource(cell)}\n\n# Error\n${error.ename}: ${error.evalue}\n${traceback.slice(-MAX_TRACEBACK_CHARS)}${definitionContext(model, cell, error)}`,
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

// NameErrorでは、綴りミス・定義cellの未実行・未定義を区別できるよう、
// その名前と似た名前を定義しているcellと実行状態をNotebook全体から添える。
function definitionContext(model, cell, error) {
  const match = /name '([^']+)' is not defined/.exec(error.evalue);
  if (match === null) {
    return '';
  }
  const name = match[1];
  const defined = new Map();
  model.content.cells.forEach((candidate, index) => {
    if (candidate.cell_type !== 'code') {
      return;
    }
    const where = candidate.id === cell.id ? 'このcell' : `cell ${index + 1}`;
    const state = candidate.execution_count === null ? '未実行' : `実行済み In [${candidate.execution_count}]`;
    for (const identifier of definedNames(cellSource(candidate))) {
      defined.set(identifier, [...defined.get(identifier) ?? [], `${where}（${state}）`]);
    }
  });
  const exact = defined.get(name) ?? [];
  const similar = [...defined.keys()].filter((candidate) => candidate !== name && similarName(candidate, name));
  return `\n\n# Notebook\n${
    exact.length === 0 ? `名前 ${name} はどのcellでも定義されていない。` : `名前 ${name} は ${exact.join('、')} で定義されている。`
  }\n${
    similar.length === 0
      ? '似た名前の定義はない。'
      : similar.map((candidate) => `${
        candidate.toLowerCase() === name.toLowerCase() ? '大文字小文字だけが違う名前' : '綴りが似た名前'
      } ${candidate} が ${defined.get(candidate).join('、')} で定義されている。`).join('\n')
  }`;
}

function definedNames(source) {
  const names = new Set();
  for (const match of source.matchAll(/(?:^|[^\w.(,])([A-Za-z_]\w*)\s*(?:=[^=]|\+=|-=)|\b(?:def|import|as|for)\s+([A-Za-z_]\w*)/gm)) {
    names.add(match[1] ?? match[2]);
  }
  return names;
}

function similarName(left, right) {
  return left.toLowerCase() === right.toLowerCase() ||
    (Math.abs(left.length - right.length) <= 2 && editDistance(left, right) <= 2);
}

function editDistance(left, right) {
  let previous = [...Array(right.length + 1).keys()];
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= right.length; j += 1) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[right.length];
}

function cellSource(cell) {
  return Array.isArray(cell.source) ? cell.source.join('') : cell.source;
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
