import type { Contents } from '@jupyterlab/services';
import type { PersonalObjects } from './platform.js';

const CONTENT_PREFIX = 'contents/';
const CHECKPOINT_PREFIX = 'checkpoints/';

export type StoredModel = Contents.IModel;

export function contentKey(path: string): string {
  return `${CONTENT_PREFIX}${encodePath(path)}`;
}

export function contentPath(key: string): string {
  if (!key.startsWith(CONTENT_PREFIX)) {
    throw new Error(`Invalid content key: ${key}`);
  }
  return decodePath(key.slice(CONTENT_PREFIX.length));
}

export function checkpointKey(path: string, id: string): string {
  return `${CHECKPOINT_PREFIX}${encodeURIComponent(path)}/${id}`;
}

export function checkpointPrefix(path: string): string {
  return `${CHECKPOINT_PREFIX}${encodeURIComponent(path)}/`;
}

export async function readModel(
  objects: PersonalObjects,
  path: string,
): Promise<StoredModel | null> {
  const object = await objects.get(contentKey(path));
  if (object === null) {
    return null;
  }
  return JSON.parse(await object.text()) as StoredModel;
}

export async function writeModel(
  objects: PersonalObjects,
  model: StoredModel,
): Promise<void> {
  await objects.put(contentKey(model.path), JSON.stringify(model), {
    contentType: 'application/json',
  });
}

function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

function decodePath(path: string): string {
  return path.split('/').map(decodeURIComponent).join('/');
}
