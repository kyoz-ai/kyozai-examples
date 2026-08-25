export interface PersonalObjectInfo {
  key: string;
  size: number;
  uploaded: string;
}

export interface PersonalObjects {
  list(options?: { prefix?: string }): Promise<PersonalObjectInfo[]>;
  get(key: string): Promise<Response | null>;
  put(key: string, value: BodyInit, options?: { contentType?: string }): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface MembershipTable {
  upsert(
    key: Record<string, string | number | boolean | null>,
    values: Record<string, string | number | boolean | null>,
  ): Promise<void>;
  delete(key: Record<string, string | number | boolean | null>): Promise<void>;
}

export interface CourseLearner {
  membershipId: string;
  displayName: string;
}

export interface IdentityContext {
  roles: string[];
}

const capabilityRoot = '/_kyozai/capabilities';

export const personalObjects: PersonalObjects = {
  async list({ prefix = '' } = {}) {
    return requestJSON<PersonalObjectInfo[]>(
      `${capabilityRoot}/personal/objects?prefix=${encodeURIComponent(prefix)}`,
    );
  },
  async get(key) {
    const response = await fetch(personalObjectURL(key));
    if (response.status === 404) {
      return null;
    }
    requireSuccess(response);
    return response;
  },
  async put(key, value, options = {}) {
    const headers = new Headers();
    if (options.contentType !== undefined) {
      headers.set('content-type', options.contentType);
    }
    requireSuccess(await fetch(personalObjectURL(key), {
      method: 'PUT',
      headers,
      body: value,
    }));
  },
  async delete(key) {
    requireSuccess(await fetch(personalObjectURL(key), { method: 'DELETE' }));
  },
};

export function membershipTable(name: string): MembershipTable {
  const url = `${capabilityRoot}/database/membership/${encodeURIComponent(name)}`;
  return {
    async upsert(key, values) {
      await mutation(url, 'PUT', { key, values });
    },
    async delete(key) {
      await mutation(url, 'DELETE', { key });
    },
  };
}

export async function databaseSQL<Row>(
  sql: string,
  params: Array<string | number | boolean | null>,
): Promise<Row[]> {
  const result = await requestJSON<{ results: Row[] }>(
    `${capabilityRoot}/database/sql`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sql, params }),
    },
  );
  return result.results;
}

export function courseLearners(): Promise<CourseLearner[]> {
  return requestJSON(`${capabilityRoot}/course/learners`);
}

export function identityContext(): Promise<IdentityContext> {
  return requestJSON(`${capabilityRoot}/context`);
}

async function mutation(
  url: string,
  method: 'PUT' | 'DELETE',
  body: object,
): Promise<void> {
  requireSuccess(await fetch(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }));
}

async function requestJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  requireSuccess(response);
  return response.json() as Promise<T>;
}

function personalObjectURL(key: string): string {
  return `${capabilityRoot}/personal/objects/${encodeURIComponent(key)}`;
}

function requireSuccess(response: Response): void {
  if (!response.ok) {
    throw new Error(`kyoz.ai request failed: ${response.status}`);
  }
}
