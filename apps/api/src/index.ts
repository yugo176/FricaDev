import { createLogger } from '@fricadev/logger';
import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { createStorage } from './lib/storage.js';

const env = loadEnv();
const logger = createLogger('api');
const storage = await createStorage(env);
const app = createApp({ env, db: prisma, logger, storage });

const server = app.listen(env.API_PORT, () => {
  logger.info(`API FricaDev sur http://localhost:${env.API_PORT}/v1/health`);
});

async function shutdown(signal: string) {
  logger.info({ signal }, 'Arrêt en cours');
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
