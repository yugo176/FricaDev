import { describe, expect, it } from 'vitest';
import request from 'supertest';
import type { PrismaClient } from '../src/lib/prisma.js';
import { createLogger } from '@fricadev/logger';
import { createApp } from '../src/app.js';
import { loadEnv } from '../src/config/env.js';
import type { Storage } from '../src/lib/storage.js';

const storage: Storage = { put: async () => '', deleteByUrl: async () => undefined };

const app = createApp({
  env: loadEnv({ NODE_ENV: 'test' }),
  db: {} as PrismaClient,
  logger: createLogger('api-test'),
  storage,
});

describe('API', () => {
  it('répond sur /v1/health', async () => {
    const res = await request(app).get('/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('refuse de créer une publication sans authentification', async () => {
    const res = await request(app).post('/v1/posts').send({});
    expect(res.status).toBe(401);
  });

  it('renvoie une erreur 404 structurée', async () => {
    const res = await request(app).get('/v1/inconnu');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not_found');
  });
});
