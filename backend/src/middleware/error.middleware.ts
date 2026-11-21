import type { ErrorRequestHandler } from 'express';
export class ApiException extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) { super(message); }
}
export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred';
  if (error instanceof ApiException) {
    ({ status, code, message } = error);
  } else if (error && typeof error === 'object' && 'type' in error) {
    if (error.type === 'entity.parse.failed') { status = 400; code = 'INVALID_JSON'; message = 'Request body must be valid JSON'; }
    if (error.type === 'entity.too.large') { status = 413; code = 'PAYLOAD_TOO_LARGE'; message = 'Request body exceeds 32 KB'; }
    if (error.type === 'encoding.unsupported' || error.type === 'charset.unsupported') {
      status = 415; code = 'UNSUPPORTED_ENCODING'; message = 'Unsupported request encoding';
    }
  }
  res.status(status).json({ error: { code, message, requestId: res.locals.requestId } });
};
