import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  AUTH_PORT: z.coerce.number().int().default(4001),
  /** URL publique du service : c'est l'« issuer » inscrit dans chaque token. */
  AUTH_ISSUER: z.url().default('http://localhost:4001'),
  /** Clés de signature des cookies, séparées par des virgules (rotation possible). */
  AUTH_COOKIE_KEYS: z.string().min(32),
  /** JWKS privé (JSON), généré avec `npm run keys:generate`. */
  AUTH_JWKS: z.string().optional(),
  API_AUDIENCE: z.string().default('https://api.fricadev.local'),
  WEB_URL: z.url().default('http://localhost:5173'),
  WEB_CLIENT_ID: z.string().default('fricadev-web'),
  WEB_CLIENT_SECRET: z.string().min(32),
  /** OAuth App GitHub (facultatif) : active « Continuer avec GitHub ». */
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Variables d'environnement invalides : ${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}
