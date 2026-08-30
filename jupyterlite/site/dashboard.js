const [learners, progress, contents] = await Promise.all([
  requestJSON('/_kyozai/capabilities/course/learners'),
  requestJSON('/_kyozai/capabilities/database/sql', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      sql: `SELECT membership_id, path, last_modified, code_cells, executed_code_cells
            FROM notebook_progress`,
      params: [],
    }),
  }).then((result) => result.results),
  requestJSON('/kyozai/contents.json'),
]);
const notebooks = contents
  .filter((entry) => entry.type === 'notebook')
  .map((entry) => entry.path)
  .sort();
const progressByLearner = new Map();
for (const notebook of progress) {
  const rows = progressByLearner.get(notebook.membership_id) ?? new Map();
  rows.set(notebook.path, notebook);
  progressByLearner.set(notebook.membership_id, rows);
}
const status = requiredElement('#status');
const table = requiredElement('table');
const head = requiredElement('thead tr');
const body = requiredElement('tbody');

for (const notebook of notebooks) {
  const cell = document.createElement('th');
  cell.textContent = notebook;
  head.append(cell);
}
for (const learner of learners) {
  const rows = progressByLearner.get(learner.membershipId) ?? new Map();
  const current = latest([...rows.values()].filter((notebook) => notebooks.includes(notebook.path)));
  const element = row(learnerButton(learner), ...notebooks.map((notebook) => summary(rows.get(notebook))));
  if (current !== null) {
    element.children[notebooks.indexOf(current.path) + 1].classList.add('current');
  }
  body.append(element);
}
status.hidden = true;
table.hidden = false;

function latest(rows) {
  return rows.reduce(
    (newest, notebook) => newest === null || notebook.last_modified > newest.last_modified ? notebook : newest,
    null,
  );
}

function summary(notebook) {
  if (notebook === undefined) {
    return '未着手';
  }
  const saved = new Date(notebook.last_modified).toLocaleString('ja-JP');
  if (notebook.executed_code_cells === notebook.code_cells) {
    return `完了 (${saved})`;
  }
  return `進行中 ${notebook.executed_code_cells} / ${notebook.code_cells} (${saved})`;
}

function learnerButton(learner) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'learner';
  button.textContent = learner.displayName;
  button.setAttribute('aria-expanded', 'false');
  button.addEventListener('click', () => toggleExecutions(button, learner));
  return button;
}

async function toggleExecutions(button, learner) {
  const learnerRow = button.closest('tr');
  const opened = learnerRow.nextElementSibling;
  if (opened !== null && opened.classList.contains('executions')) {
    opened.remove();
    button.setAttribute('aria-expanded', 'false');
    return;
  }
  button.disabled = true;
  try {
    const executions = await requestJSON('/_kyozai/capabilities/database/sql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sql: `SELECT path, executed_at, execution_count, success, error
              FROM cell_executions WHERE membership_id = ? ORDER BY executed_at DESC`,
        params: [learner.membershipId],
      }),
    }).then((result) => result.results);
    const element = document.createElement('tr');
    element.className = 'executions';
    const cell = document.createElement('td');
    cell.colSpan = notebooks.length + 1;
    cell.append(executionLog(executions));
    element.append(cell);
    learnerRow.after(element);
    button.setAttribute('aria-expanded', 'true');
  } finally {
    button.disabled = false;
  }
}

function executionLog(executions) {
  if (executions.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'カーネルの実行記録はありません';
    return empty;
  }
  const table = document.createElement('table');
  const head = document.createElement('thead');
  const headings = document.createElement('tr');
  for (const heading of ['実行日時', 'Notebook', 'Cell', '結果']) {
    const cell = document.createElement('th');
    cell.textContent = heading;
    headings.append(cell);
  }
  head.append(headings);
  const body = document.createElement('tbody');
  for (const execution of executions) {
    const element = row(
      new Date(execution.executed_at).toLocaleString('ja-JP'),
      execution.path,
      `In [${execution.execution_count ?? ' '}]`,
      execution.success ? '成功' : '失敗',
    );
    element.className = execution.success ? 'success' : 'failure';
    body.append(element);
    if (execution.error !== null) {
      const errorRow = document.createElement('tr');
      const errorCell = document.createElement('td');
      errorCell.colSpan = 4;
      const traceback = document.createElement('pre');
      traceback.textContent = execution.error.replace(/\x1b\[[0-9;]*m/g, '');
      errorCell.append(traceback);
      errorRow.append(errorCell);
      body.append(errorRow);
    }
  }
  table.append(head, body);
  return table;
}

async function requestJSON(url, init) {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`${url}: ${response.status}`);
  }
  return response.json();
}

function requiredElement(selector) {
  const element = document.querySelector(selector);
  if (element === null) {
    throw new Error(`Missing dashboard element: ${selector}`);
  }
  return element;
}

function row(...values) {
  const element = document.createElement('tr');
  for (const value of values) {
    const cell = document.createElement('td');
    cell.append(value);
    element.append(cell);
  }
  return element;
}
