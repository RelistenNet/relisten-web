import { API_DOMAIN, SERVER_API_DOMAIN } from '../constants';

/**
 * Orval mutator: every generated v4 call goes through here. Paths come in
 * relative (`/api/v4/...`); this adds the API origin (in-cluster on the server)
 * and returns the shape orval's fetch client expects ({ data, status, headers }).
 *
 * No caching here: server callers wrap these in timber's `cache.data`.
 */
export async function relistenFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const origin = typeof window === 'undefined' ? SERVER_API_DOMAIN : API_DOMAIN;
  const res = await fetch(`${origin}${url}`, init);
  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  const data = body ? JSON.parse(body) : null;
  return { data, status: res.status, headers: res.headers } as T;
}

export class RelistenApiError extends Error {
  constructor(readonly status: number) {
    super(`Relisten API responded ${status}`);
  }
}

/** Statuses meaning "this doesn't exist (or no longer does)": 404, 410, and 422 for a malformed id. */
export const isMissingStatus = (status: number) =>
  status === 404 || status === 410 || status === 422;

/** Unwraps a generated call's 200 body, or throws RelistenApiError with the status. */
export async function unwrap<R extends { status: number; data: unknown }>(
  call: Promise<R>
): Promise<Extract<R, { status: 200 }>['data']> {
  const res = await call;
  if (res.status !== 200) throw new RelistenApiError(res.status);
  return res.data as Extract<R, { status: 200 }>['data'];
}
