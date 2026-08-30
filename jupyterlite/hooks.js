const PROGRESS_URL = '/_kyozai/capabilities/database/membership/notebook_progress';
const EXECUTIONS_URL = '/_kyozai/capabilities/database/membership/cell_executions';

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
  await mutate(EXECUTIONS_URL, 'PUT', {
    key: { path: model.path, cell_id: cell.id, executed_at: new Date().toISOString() },
    values: {
      execution_count: cell.execution_count,
      success,
      error: error === undefined ? null : `${error.ename}: ${error.evalue}\n${error.traceback.join('\n')}`,
    },
  });
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
