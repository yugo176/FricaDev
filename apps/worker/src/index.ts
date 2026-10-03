import PgBoss from 'pg-boss';
import pg from 'pg';
import { z } from 'zod';
import { createLogger } from '@fricadev/logger';
import { processOutboxBatch } from './outbox.js';

/**
 * Tâches de fond :
 * - publication de l'outbox (notifications…) toutes les quelques secondes ;
 * - maintenance planifiée via pg-boss (sur PostgreSQL : pas de Redis à opérer).
 */
const env = z
  .object({
    WORKER_DATABASE_URL: z.string().min(1),
    OUTBOX_POLL_MS: z.coerce.number().int().min(500).default(3000),
  })
  .parse(process.env);

const logger = createLogger('worker');
const pool = new pg.Pool({ connectionString: env.WORKER_DATABASE_URL, max: 3 });
pool.on('error', (err) => logger.error({ err }, 'Erreur du pool PostgreSQL'));

let stopping = false;
async function outboxLoop() {
  while (!stopping) {
    try {
      const processed = await processOutboxBatch(pool, logger);
      if (processed > 0) logger.info({ processed }, 'Événements outbox traités');
      // Lot plein : on enchaîne tout de suite, sinon on attend.
      if (processed < 50) await new Promise((r) => setTimeout(r, env.OUTBOX_POLL_MS));
    } catch (err) {
      logger.error({ err }, 'Échec du traitement de l’outbox, nouvel essai bientôt');
      await new Promise((r) => setTimeout(r, env.OUTBOX_POLL_MS * 3));
    }
  }
}

const boss = new PgBoss({ connectionString: env.WORKER_DATABASE_URL, schema: 'jobs' });
boss.on('error', (err) => logger.error({ err }, 'Erreur pg-boss'));
await boss.start();

const CLEANUP_QUEUE = 'maintenance.outbox-cleanup';
await boss.createQueue(CLEANUP_QUEUE);
await boss.schedule(CLEANUP_QUEUE, '0 3 * * *'); // chaque nuit à 3 h
await boss.work(CLEANUP_QUEUE, async () => {
  const { rowCount } = await pool.query(
    `DELETE FROM app."OutboxEvent" WHERE "processedAt" < now() - interval '7 days'`,
  );
  logger.info({ deleted: rowCount }, 'Événements outbox anciens supprimés');
  // Notifications : archivées depuis 90 jours ou lues depuis un an, sauf les épinglées.
  const notifications = await pool.query(
    `DELETE FROM app."Notification"
     WHERE "pinnedAt" IS NULL
       AND ("archivedAt" < now() - interval '90 days' OR "readAt" < now() - interval '1 year')`,
  );
  logger.info({ deleted: notifications.rowCount }, 'Anciennes notifications supprimées');
});

void outboxLoop();
logger.info('Worker FricaDev démarré');

async function shutdown() {
  stopping = true;
  await boss.stop({ graceful: true });
  await pool.end();
  process.exit(0);
}
process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());
