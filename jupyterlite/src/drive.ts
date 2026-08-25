import { PathExt, URLExt } from '@jupyterlab/coreutils';
import type { Contents } from '@jupyterlab/services';
import { ServerConnection } from '@jupyterlab/services';
import type { ISignal } from '@lumino/signaling';
import { Signal } from '@lumino/signaling';
import type { MembershipTable, PersonalObjects } from './platform.js';

import {
  checkpointKey,
  checkpointPrefix,
  contentKey,
  contentPath,
  readModel,
  writeModel,
  type StoredModel,
} from './storage.js';
import { recordProgress, removeProgress } from './progress.js';

const encoder = new TextEncoder();
const SEED_KEY = 'initial-content/1';

export class KyozaiDrive implements Contents.IDrive {
  constructor(
    private readonly objects: PersonalObjects,
    private readonly progress: MembershipTable,
    options: { baseUrl: string; contentsIndex: string },
  ) {
    this.ready = this.initialize(options);
  }

  readonly name = 'kyoz.ai';
  readonly serverSettings = ServerConnection.makeSettings();
  readonly ready: Promise<void>;

  get fileChanged(): ISignal<Contents.IDrive, Contents.IChangedArgs> {
    return this.changed;
  }

  get isDisposed(): boolean {
    return this.disposed;
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    Signal.clearData(this);
  }

  async get(
    path: string,
    options: Contents.IFetchOptions = {},
  ): Promise<Contents.IModel> {
    await this.ready;
    path = normalizePath(path);
    if (path === '') {
      return this.directoryModel('', options.content === true);
    }
    const stored = await readModel(this.objects, path);
    if (stored === null) {
      throw new Error(`Could not find content with path ${path}`);
    }
    const model = writableModel(stored);
    if (model.type === 'directory') {
      return this.directoryModel(path, options.content === true, model);
    }
    return options.content === false ? { ...model, content: null } : model;
  }

  async getDownloadUrl(path: string): Promise<string> {
    const model = await this.get(path, { content: true });
    if (model.type === 'directory') {
      throw new Error(`Cannot download directory ${path}`);
    }
    return URL.createObjectURL(
      new Blob([fileContent(model)], { type: model.mimetype ?? '' }),
    );
  }

  async newUntitled(
    options: Contents.ICreateOptions = {},
  ): Promise<Contents.IModel> {
    await this.ready;
    const directory = normalizePath(options.path ?? '');
    const type = options.type ?? 'notebook';
    const ext = options.ext ?? (type === 'notebook' ? '.ipynb' : '.txt');
    const stem = type === 'directory' ? 'Untitled Folder' : 'Untitled';
    const names = new Set(
      (await this.children(directory)).map((model) => model.name),
    );
    let index = 0;
    let name = `${stem}${type === 'directory' ? '' : ext}`;
    while (names.has(name)) {
      index += 1;
      name = `${stem}${index}${type === 'directory' ? '' : ext}`;
    }

    const path = PathExt.join(directory, name);
    const now = new Date().toISOString();
    const model: Contents.IModel = {
      name,
      path,
      created: now,
      last_modified: now,
      content: type === 'notebook' ? emptyNotebook() : null,
      format: type === 'notebook' || type === 'directory' ? 'json' : 'text',
      mimetype:
        type === 'notebook'
          ? 'application/x-ipynb+json'
          : type === 'file'
            ? 'text/plain'
            : '',
      size: 0,
      type,
      writable: true,
    };
    await writeModel(this.objects, model);
    this.changed.emit({ type: 'new', oldValue: null, newValue: model });
    return model;
  }

  async save(
    path: string,
    options: Partial<Contents.IModel> & Contents.IContentProvisionOptions = {},
  ): Promise<Contents.IModel> {
    await this.ready;
    path = normalizePath(path);
    const previous = await readModel(this.objects, path);
    const now = new Date().toISOString();
    const type = options.type ?? previous?.type ?? inferType(path);
    const content = options.content ?? previous?.content ?? null;
    const format = options.format ?? previous?.format ?? inferFormat(type);
    const model: Contents.IModel = {
      name: PathExt.basename(path),
      path,
      created: previous?.created ?? now,
      last_modified: now,
      content,
      format,
      mimetype: options.mimetype ?? previous?.mimetype ?? '',
      size: contentSize(content, format),
      type,
      writable: true,
    };
    await writeModel(this.objects, model);
    await recordProgress(this.progress, [model]);
    this.changed.emit({
      type: previous === null ? 'new' : 'save',
      oldValue: previous,
      newValue: model,
    });
    return model;
  }

  async delete(path: string): Promise<void> {
    path = normalizePath(path);
    const model = await this.get(path, { content: false });
    const descendants =
      model.type === 'directory'
        ? await this.modelsWithPrefix(`${path}/`)
        : [];
    await Promise.all([
      this.objects.delete(contentKey(path)),
      ...descendants.map((entry) => this.objects.delete(contentKey(entry.path))),
    ]);
    await removeProgress(this.progress, [model, ...descendants]);
    this.changed.emit({ type: 'delete', oldValue: model, newValue: null });
  }

  async rename(oldPath: string, newPath: string): Promise<Contents.IModel> {
    oldPath = normalizePath(oldPath);
    newPath = normalizePath(newPath);
    const model = await this.get(oldPath, { content: true });
    const descendants =
      model.type === 'directory' ? await this.modelsWithPrefix(`${oldPath}/`) : [];
    const renamed = moveModel(model, oldPath, newPath);
    const moved = descendants.map((child) => moveModel(child, oldPath, newPath));
    await Promise.all([renamed, ...moved].map((entry) => writeModel(this.objects, entry)));
    await Promise.all(
      [model, ...descendants].map((entry) =>
        this.objects.delete(contentKey(entry.path)),
      ),
    );
    await removeProgress(this.progress, [model, ...descendants]);
    await recordProgress(this.progress, [renamed, ...moved]);
    this.changed.emit({ type: 'rename', oldValue: model, newValue: renamed });
    return renamed;
  }

  async copy(path: string, toDir: string): Promise<Contents.IModel> {
    path = normalizePath(path);
    toDir = normalizePath(toDir);
    const source = await this.get(path, { content: true });
    const targetPath = await this.availableCopyPath(PathExt.join(toDir, source.name));
    const copied = copyModel(source, path, targetPath);
    const descendants =
      source.type === 'directory' ? await this.modelsWithPrefix(`${path}/`) : [];
    const copies = descendants.map((child) => copyModel(child, path, targetPath));
    await Promise.all([copied, ...copies].map((entry) => writeModel(this.objects, entry)));
    await recordProgress(this.progress, [copied, ...copies]);
    this.changed.emit({ type: 'new', oldValue: null, newValue: copied });
    return copied;
  }

  async createCheckpoint(path: string): Promise<Contents.ICheckpointModel> {
    await this.ready;
    path = normalizePath(path);
    const model = await this.get(path, { content: true });
    const checkpoint = {
      id: crypto.randomUUID(),
      last_modified: new Date().toISOString(),
    };
    await this.objects.put(
      checkpointKey(path, checkpoint.id),
      JSON.stringify({ checkpoint, model }),
      { contentType: 'application/json' },
    );
    return checkpoint;
  }

  async listCheckpoints(path: string): Promise<Contents.ICheckpointModel[]> {
    await this.ready;
    const objects = await this.objects.list({ prefix: checkpointPrefix(path) });
    return Promise.all(
      objects.map(async (object) => {
        const value = await this.objects.get(object.key);
        if (value === null) {
          throw new Error(`Checkpoint disappeared while listing: ${object.key}`);
        }
        return (JSON.parse(await value.text()) as StoredCheckpoint).checkpoint;
      }),
    );
  }

  async restoreCheckpoint(path: string, checkpointID: string): Promise<void> {
    await this.ready;
    const object = await this.objects.get(checkpointKey(path, checkpointID));
    if (object === null) {
      throw new Error(`Could not find checkpoint ${checkpointID} for ${path}`);
    }
    const stored = JSON.parse(await object.text()) as StoredCheckpoint;
    const restored = {
      ...stored.model,
      last_modified: new Date().toISOString(),
    };
    await writeModel(this.objects, restored);
    await recordProgress(this.progress, [restored]);
  }

  async deleteCheckpoint(path: string, checkpointID: string): Promise<void> {
    await this.ready;
    await this.objects.delete(checkpointKey(path, checkpointID));
  }

  private async initialize(options: {
    baseUrl: string;
    contentsIndex: string;
  }): Promise<void> {
    const seedObjects = await this.objects.list({ prefix: SEED_KEY });
    if (seedObjects.some((object) => object.key === SEED_KEY)) {
      return;
    }
    const indexUrl = URLExt.join(
      options.baseUrl,
      'api/contents',
      options.contentsIndex,
    );
    const response = await fetch(indexUrl);
    if (!response.ok) {
      throw new Error(`Initial contents request failed: ${response.status}`);
    }
    const root = (await response.json()) as Contents.IModel;
    const models = flattenContents(root);
    await Promise.all(
      models.map(async (model) => {
        const stored =
          model.type === 'directory'
            ? normalizeSeedModel(model, null)
            : normalizeSeedModel(
                model,
                await readSeedContent(options.baseUrl, model),
              );
        await writeModel(this.objects, stored);
      }),
    );
    await this.objects.put(SEED_KEY, '', { contentType: 'text/plain' });
  }

  private async directoryModel(
    path: string,
    includeContent: boolean,
    stored?: Contents.IModel,
  ): Promise<Contents.IModel> {
    const now = new Date().toISOString();
    return {
      name: path === '' ? '' : PathExt.basename(path),
      path,
      created: stored?.created ?? now,
      last_modified: stored?.last_modified ?? now,
      content: includeContent ? await this.children(path) : null,
      format: 'json',
      mimetype: '',
      type: 'directory',
      writable: true,
    };
  }

  private async children(path: string): Promise<Contents.IModel[]> {
    const prefix = path === '' ? '' : `${path}/`;
    const models = await this.modelsWithPrefix(prefix);
    return models
      .filter((model) => PathExt.dirname(model.path) === path)
      .map((model) => ({ ...model, content: null }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  private async modelsWithPrefix(path: string): Promise<Contents.IModel[]> {
    const objects = await this.objects.list({ prefix: contentKey(path) });
    return Promise.all(
      objects.map(async (object) => {
        const model = await readModel(this.objects, contentPath(object.key));
        if (model === null) {
          throw new Error(`Content disappeared while listing: ${object.key}`);
        }
        return writableModel(model);
      }),
    );
  }

  private async availableCopyPath(path: string): Promise<string> {
    const directory = PathExt.dirname(path);
    const extension = PathExt.extname(path);
    const stem = PathExt.basename(path, extension);
    const names = new Set(
      (await this.children(directory)).map((model) => model.name),
    );
    let index = 0;
    let candidate = `${stem}-Copy${extension}`;
    while (names.has(candidate)) {
      index += 1;
      candidate = `${stem}-Copy${index}${extension}`;
    }
    return PathExt.join(directory, candidate);
  }

  private readonly changed = new Signal<Contents.IDrive, Contents.IChangedArgs>(this);
  private disposed = false;
}

interface StoredCheckpoint {
  checkpoint: Contents.ICheckpointModel;
  model: Contents.IModel;
}

function normalizePath(path: string): string {
  return PathExt.normalize(path).replace(/^\.\/?/, '').replace(/^\/+|\/+$/g, '');
}

function inferType(path: string): Contents.ContentType {
  return path.endsWith('.ipynb') ? 'notebook' : 'file';
}

function inferFormat(type: Contents.ContentType): Contents.FileFormat {
  return type === 'notebook' || type === 'directory' ? 'json' : 'text';
}

function emptyNotebook(): object {
  return { cells: [], metadata: {}, nbformat: 4, nbformat_minor: 5 };
}

function contentSize(content: unknown, format: Contents.FileFormat | null): number {
  if (content === null) {
    return 0;
  }
  const serialized = format === 'json' ? JSON.stringify(content) : String(content);
  return encoder.encode(serialized).length;
}

function fileContent(model: Contents.IModel): BlobPart {
  if (model.format === 'base64') {
    const value = atob(String(model.content));
    return Uint8Array.from(value, (character) => character.charCodeAt(0));
  }
  return model.format === 'json'
    ? JSON.stringify(model.content, null, 2)
    : String(model.content);
}

function moveModel(
  model: Contents.IModel,
  oldPrefix: string,
  newPrefix: string,
): Contents.IModel {
  const path = `${newPrefix}${model.path.slice(oldPrefix.length)}`;
  return {
    ...model,
    name: PathExt.basename(path),
    path,
    last_modified: new Date().toISOString(),
  };
}

function copyModel(
  model: Contents.IModel,
  oldPrefix: string,
  newPrefix: string,
): Contents.IModel {
  const now = new Date().toISOString();
  return {
    ...moveModel(model, oldPrefix, newPrefix),
    created: now,
    last_modified: now,
  };
}

function flattenContents(root: Contents.IModel): Contents.IModel[] {
  const children = Array.isArray(root.content) ? (root.content as Contents.IModel[]) : [];
  return children.flatMap((child) => [child, ...flattenContents(child)]);
}

async function readSeedContent(
  baseUrl: string,
  model: Contents.IModel,
): Promise<unknown> {
  const response = await fetch(URLExt.join(baseUrl, 'files', model.path));
  if (!response.ok) {
    throw new Error(`Initial content request failed for ${model.path}: ${response.status}`);
  }
  if (model.type === 'notebook' || model.path.endsWith('.json')) {
    return response.json();
  }
  if (model.mimetype.startsWith('text/')) {
    return response.text();
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function normalizeSeedModel(
  model: Contents.IModel,
  content: unknown,
): Contents.IModel {
  const format =
    model.type === 'notebook' || model.type === 'directory'
      ? 'json'
      : model.mimetype.startsWith('text/')
        ? 'text'
        : 'base64';
  return {
    ...model,
    content,
    format,
    writable: true,
    mimetype:
      model.mimetype ||
      (model.type === 'notebook' ? 'application/x-ipynb+json' : ''),
    size: model.size ?? contentSize(content, format),
  };
}

function writableModel(model: Contents.IModel): Contents.IModel {
  return { ...model, writable: true };
}
