import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().default(4000),
  API_CORS_ORIGINS: z.string().default('http://localhost:5173'),
  /** URL publique du service d'identité : sert à récupérer les clés publiques (JWKS). */
  AUTH_ISSUER: z.url().default('http://localhost:4001'),
  /** Adresse interne des clés publiques (réseau Docker) ; par défaut {AUTH_ISSUER}/jwks. */
  AUTH_JWKS_URL: z.url().optional(),
  /** Audience attendue dans les access tokens émis pour cette API. */
  API_AUDIENCE: z.string().default('https://api.fricadev.local'),
  /** Stockage des fichiers : disque local (défaut) ou stockage objet S3 (Datacloud). */
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  UPLOADS_DIR: z.string().default('uploads'),
  PUBLIC_UPLOADS_URL: z.url().default('http://localhost:4000/uploads'),
  S3_ENDPOINT: z.url().optional(),
  S3_REGION: z.string().default('auto'),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_PUBLIC_URL: z.url().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Variables d'environnement invalides : ${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}
