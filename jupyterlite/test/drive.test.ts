import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  MembershipTable,
  PersonalObjectInfo,
  PersonalObjects,
} from '../src/platform.js';

import { KyozaiDrive } from '../src/drive.js';

test('stores each learner notebook in a separate Personal Objects scope', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = seedFetch;
  try {
    const learnerOneObjects = new MemoryObjects();
    const learnerTwoObjects = new MemoryObjects();
    const learnerOneProgress = new MemoryMembershipTable();
    const learnerTwoProgress = new MemoryMembershipTable();
    const learnerOne = createDrive(learnerOneObjects, learnerOneProgress);
    const learnerTwo = createDrive(learnerTwoObjects, learnerTwoProgress);

    const initialOne = await learnerOne.get('01-introduction.ipynb');
    const initialTwo = await learnerTwo.get('01-introduction.ipynb');
    const content = structuredClone(initialOne.content);
    content.cells[1].execution_count = 1;
    await learnerOne.save(initialOne.path, { ...initialOne, content });

    assert.equal(
      (await learnerOne.get(initialOne.path)).content.cells[1].execution_count,
      1,
    );
    assert.equal(initialTwo.content.cells[1].execution_count, null);
    assert.equal(
      learnerOneProgress.rows.get('01-introduction.ipynb')
        ?.executed_code_cells,
      1,
    );
    assert.equal(learnerTwoProgress.rows.size, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('uses current Platform write access for previously stored notebook models', async () => {
  const objects = new MemoryObjects();
  await objects.put('initial-content/1', '');
  await objects.put('contents/legacy.ipynb', JSON.stringify({
    name: 'legacy.ipynb',
    path: 'legacy.ipynb',
    type: 'notebook',
    writable: false,
    created: '2026-08-25T00:00:00.000Z',
    last_modified: '2026-08-25T00:00:00.000Z',
    mimetype: 'application/x-ipynb+json',
    content: { cells: [], metadata: {}, nbformat: 4, nbformat_minor: 5 },
    format: 'json',
    size: 0,
  }));

  const drive = createDrive(objects, new MemoryMembershipTable());
  assert.equal((await drive.get('legacy.ipynb')).writable, true);
  const root = await drive.get('', { content: true });
  assert.equal(root.content[0].writable, true);
});

function createDrive(
  objects: PersonalObjects,
  progress: MembershipTable,
): KyozaiDrive {
  return new KyozaiDrive(objects, progress, {
    baseUrl: 'https://course.example/',
    contentsIndex: 'all.json',
  });
}

class MemoryMembershipTable implements MembershipTable {
  readonly rows = new Map<
    string,
    Record<string, string | number | boolean | null>
  >();

  async upsert(
    key: Record<string, string | number | boolean | null>,
    values: Record<string, string | number | boolean | null>,
  ): Promise<void> {
    this.rows.set(String(key.path), values);
  }

  async delete(key: Record<string, string | number | boolean | null>): Promise<void> {
    this.rows.delete(String(key.path));
  }
}

async function seedFetch(input: string | URL | Request): Promise<Response> {
  const url = new URL(input instanceof Request ? input.url : input.toString());
  if (url.pathname === '/api/contents/all.json') {
    return Response.json({
      name: '',
      path: '',
      type: 'directory',
      writable: true,
      created: '2026-08-25T00:00:00.000Z',
      last_modified: '2026-08-25T00:00:00.000Z',
      mimetype: '',
      content: [
        {
          name: '01-introduction.ipynb',
          path: '01-introduction.ipynb',
          type: 'notebook',
          writable: true,
          created: '2026-08-25T00:00:00.000Z',
          last_modified: '2026-08-25T00:00:00.000Z',
          mimetype: '',
          content: null,
          format: 'json',
          size: 100,
        },
      ],
      format: 'json',
    });
  }
  if (url.pathname === '/files/01-introduction.ipynb') {
    return Response.json({
      cells: [
        { cell_type: 'markdown', source: ['Lesson'] },
        { cell_type: 'code', execution_count: null, source: ['1 + 1'] },
      ],
      metadata: {},
      nbformat: 4,
      nbformat_minor: 5,
    });
  }
  return new Response('Not Found', { status: 404 });
}

class MemoryObjects implements PersonalObjects {
  private readonly values = new Map<string, { body: string; uploaded: string }>();

  async list({ prefix = '' }: { prefix?: string } = {}): Promise<PersonalObjectInfo[]> {
    return [...this.values.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => ({
        key,
        size: new TextEncoder().encode(value.body).length,
        uploaded: value.uploaded,
      }));
  }

  async get(key: string): Promise<Response | null> {
    const value = this.values.get(key);
    return value === undefined ? null : new Response(value.body);
  }

  async put(key: string, value: BodyInit): Promise<void> {
    this.values.set(key, {
      body: await new Response(value).text(),
      uploaded: new Date().toISOString(),
    });
  }

  async delete(key: string): Promise<void> {
    this.values.delete(key);
  }
}
