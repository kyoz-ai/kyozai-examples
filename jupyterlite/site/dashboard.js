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
  const element = row(learner.displayName, ...notebooks.map((notebook) => summary(rows.get(notebook))));
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
    cell.textContent = value;
    element.append(cell);
  }
  return element;
}
