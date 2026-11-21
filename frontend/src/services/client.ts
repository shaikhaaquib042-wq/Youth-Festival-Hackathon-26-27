import type { z } from 'zod';

export class ApiError extends Error {
  readonly code: string;
  readonly status?: number;
  readonly requestId?: string;
  constructor(code: string, status?: number, requestId?: string) {
    super(code);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.requestId = requestId;
  }
}
export const mockMode = () => import.meta.env.VITE_USE_MOCKS === 'true';
export function apiUrl(
  path: string,
  configured = import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.PROD ? '/api/v1' : 'http://localhost:8000/api/v1'),
) {
  const base = configured.trim().replace(/\/+$/, '');
  const normalized = base.endsWith('/api/v1') ? base : `${base}/api/v1`;
  const url = new URL(normalized, window.location.origin);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
    throw new ApiError('CONFIGURATION_ERROR');
  if (window.location.protocol === 'https:' && url.protocol !== 'https:')
    throw new ApiError('CONFIGURATION_ERROR');
  return `${url.toString().replace(/\/+$/, '')}/${path.replace(/^\/+/, '').replace(/^api\/v1\//, '')}`;
}
export interface RequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}
export async function apiRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  options: RequestOptions & { body?: unknown } = {},
): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs ?? 10_000);
  const abort = () => controller.abort();
  if (options.signal?.aborted) abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  try {
    const response = await fetch(apiUrl(path), {
      method: options.body === undefined ? 'GET' : 'POST',
      headers: {
        Accept: 'application/json',
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      signal: controller.signal,
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    });
    if (!response.ok) {
      let requestId = response.headers.get('x-request-id') ?? undefined;
      try {
        const value: unknown = await response.json();
        if (value && typeof value === 'object' && 'error' in value) {
          const error = value.error;
          if (
            error &&
            typeof error === 'object' &&
            'requestId' in error &&
            typeof error.requestId === 'string' &&
            error.requestId.length <= 150
          )
            requestId = error.requestId;
        }
      } catch {
        /* Never expose unstructured provider errors. */
      }
      throw new ApiError(`HTTP_${response.status}`, response.status, requestId);
    }
    let raw: unknown;
    try {
      raw = await response.json();
    } catch {
      throw new ApiError('INVALID_RESPONSE');
    }
    const parsed = schema.safeParse(raw);
    if (!parsed.success) throw new ApiError('INVALID_RESPONSE');
    return parsed.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted)
      throw new ApiError(timedOut ? 'REQUEST_TIMEOUT' : 'REQUEST_CANCELLED');
    throw new ApiError('NETWORK_ERROR');
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abort);
  }
}
