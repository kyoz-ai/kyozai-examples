import type { Contents } from '@jupyterlab/services';
import type { MembershipTable } from './platform.js';

export interface NotebookProgress {
  path: string;
  lastModified: string;
  codeCells: number;
  executedCodeCells: number;
}

export async function recordProgress(
  table: MembershipTable,
  models: Contents.IModel[],
): Promise<void> {
  const notebooks = models.filter((model) => model.type === 'notebook');
  await Promise.all(notebooks.map((model) => {
    const progress = notebookProgress(model);
    return table.upsert(
      { path: progress.path },
      {
        last_modified: progress.lastModified,
        code_cells: progress.codeCells,
        executed_code_cells: progress.executedCodeCells,
      },
    );
  }));
}

export async function removeProgress(
  table: MembershipTable,
  models: Contents.IModel[],
): Promise<void> {
  await Promise.all(
    models.filter((model) => model.type === 'notebook')
      .map((model) => table.delete({ path: model.path })),
  );
}

export function notebookProgress(model: Contents.IModel): NotebookProgress {
  const notebook = model.content as Notebook;
  const codeCells = notebook.cells.filter((cell) => cell.cell_type === 'code');
  return {
    path: model.path,
    lastModified: model.last_modified,
    codeCells: codeCells.length,
    executedCodeCells: codeCells.filter((cell) => cell.execution_count !== null)
      .length,
  };
}

interface Notebook {
  cells: NotebookCell[];
}

interface NotebookCell {
  cell_type: string;
  execution_count?: number | null;
}
