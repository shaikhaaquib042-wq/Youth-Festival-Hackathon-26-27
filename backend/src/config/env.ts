import 'dotenv/config';
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

// Share an ignored repository-level configuration with Prisma CLI when supplied.
// Process variables and backend/.env retain precedence; no values are logged.
loadEnv({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8000),
  FRONTEND_URL: z.url().default('http://localhost:5173'),
  DATABASE_URL: z.string().default(''),
  COMMUNITY_WRITES_ENABLED: z.enum(['true', 'false']).default('false').transform(value => value === 'true'),
  OPEN_METEO_BASE_URL: z.url().default('https://api.open-meteo.com/v1'),
  WEATHER_CACHE_TTL_SECONDS: z.coerce.number().int().min(1).max(3600).default(600),
});

export function parseEnv(input: Record<string, unknown>) {
  const result = schema.safeParse(input);
  if (!result.success) {
    // Report names only: environment values may contain credentials.
    throw new Error(`Invalid environment configuration: ${result.error.issues.map(i => i.path.join('.')).join(', ')}`);
  }
  return result.data;
}
export const env = parseEnv(process.env);
