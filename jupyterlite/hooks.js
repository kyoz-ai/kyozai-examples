const TABLE_URL = '/_kyozai/capabilities/database/membership/notebook_progress';

export async function saved(model) {
  if (model.type !== 'notebook') {
    return;
  }
  const codeCells = model.content.cells.filter((cell) => cell.cell_type === 'code');
  await mutate('PUT', {
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
  await mutate('DELETE', { key: { path: model.path } });
}

async function mutate(method, body) {
  const response = await fetch(TABLE_URL, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`${TABLE_URL}: ${response.status}`);
  }
}
