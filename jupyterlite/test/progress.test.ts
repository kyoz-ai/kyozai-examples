import assert from 'node:assert/strict';
import test from 'node:test';
import type { MembershipTable } from '../src/platform.js';

import {
  notebookProgress,
  recordProgress,
} from '../src/progress.js';

test('reports saved and executed notebook state', () => {
  const progress = notebookProgress({
    name: 'lesson.ipynb',
    path: 'lesson.ipynb',
    created: '2026-08-25T00:00:00.000Z',
    last_modified: '2026-08-25T01:00:00.000Z',
    content: {
      cells: [
        { cell_type: 'markdown', source: ['Lesson'] },
        { cell_type: 'code', execution_count: 1, source: ['1 + 1'] },
        { cell_type: 'code', execution_count: null, source: ['2 + 2'] },
      ],
    },
    format: 'json',
    mimetype: 'application/x-ipynb+json',
    size: 1,
    type: 'notebook',
    writable: true,
  });

  assert.deepEqual(progress, {
    path: 'lesson.ipynb',
    lastModified: '2026-08-25T01:00:00.000Z',
    codeCells: 2,
    executedCodeCells: 1,
  });
});

test('upserts the learner progress projection when a notebook is saved', async () => {
  const table = new MemoryMembershipTable();
  await recordProgress(table, [
    {
      name: 'lesson.ipynb',
      path: 'lesson.ipynb',
      created: '2026-08-25T00:00:00.000Z',
      last_modified: '2026-08-25T01:00:00.000Z',
      content: {
        cells: [{ cell_type: 'code', execution_count: 1 }],
      },
      format: 'json',
      mimetype: 'application/x-ipynb+json',
      size: 1,
      type: 'notebook',
      writable: true,
    },
  ]);

  assert.deepEqual(table.rows, {
    'lesson.ipynb': {
      last_modified: '2026-08-25T01:00:00.000Z',
      code_cells: 1,
      executed_code_cells: 1,
    },
  });
});

class MemoryMembershipTable implements MembershipTable {
  readonly rows: Record<string, Record<string, string | number | boolean | null>> = {};

  async upsert(
    key: Record<string, string | number | boolean | null>,
    values: Record<string, string | number | boolean | null>,
  ): Promise<void> {
    this.rows[String(key.path)] = values;
  }

  async delete(key: Record<string, string | number | boolean | null>): Promise<void> {
    delete this.rows[String(key.path)];
  }
}
