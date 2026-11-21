import type { RequestHandler } from 'express';
import type { z } from 'zod';
import { ApiException } from './error.middleware.js';
export function validate(schema: z.ZodType): RequestHandler {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.issues.map(i => `${i.path.join('.') || 'body'}: ${i.message}`).join('; ');
      return next(new ApiException(422, 'VALIDATION_ERROR', `Invalid request data: ${message}`));
    }
    req.body = parsed.data;
    next();
  };
}
