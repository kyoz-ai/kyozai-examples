import { courseLearners, databaseSQL } from './platform.js';

interface ProgressRow {
  membership_id: string;
  path: string;
  last_modified: string;
  code_cells: number;
  executed_code_cells: number;
}

const [learners, progress] = await Promise.all([
  courseLearners(),
  databaseSQL<ProgressRow>(
    `SELECT membership_id, path, last_modified, code_cells, executed_code_cells
     FROM notebook_progress
     ORDER BY membership_id, path`,
    [],
  ),
]);
const progressByLearner = new Map<string, ProgressRow[]>();
for (const notebook of progress) {
  const rows = progressByLearner.get(notebook.membership_id) ?? [];
  rows.push(notebook);
  progressByLearner.set(notebook.membership_id, rows);
}
const status = requiredElement('#status');
const table = requiredElement('table');
const body = requiredElement('tbody');

status.hidden = true;
table.hidden = false;

for (const learner of learners) {
  const notebooks = progressByLearner.get(learner.membershipId) ?? [];
  if (notebooks.length === 0) {
    body.append(row(learner.displayName, '未保存', '0 / 0', '—'));
    continue;
  }
  for (const notebook of notebooks) {
    body.append(
      row(
        learner.displayName,
        notebook.path,
        `${notebook.executed_code_cells} / ${notebook.code_cells}`,
        new Date(notebook.last_modified).toLocaleString('ja-JP'),
      ),
    );
  }
}

function requiredElement(selector: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(selector);
  if (element === null) {
    throw new Error(`Missing dashboard element: ${selector}`);
  }
  return element;
}

function row(...values: string[]): HTMLTableRowElement {
  const element = document.createElement('tr');
  for (const value of values) {
    const cell = document.createElement('td');
    cell.textContent = value;
    element.append(cell);
  }
  return element;
}
