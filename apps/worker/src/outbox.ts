import type { Pool, PoolClient } from 'pg';
import { v7 as uuidv7 } from 'uuid';
import type { Logger } from '@fricadev/logger';

interface OutboxRow {
  id: string;
  type: string;
  payload: Record<string, string>;
}

interface Actor {
  handle: string;
  displayName: string;
  avatarUrl: string | null;
}

async function actor(client: PoolClient, userId: string): Promise<Actor | null> {
  const { rows } = await client.query<Actor>(
    'SELECT handle, "displayName", "avatarUrl" FROM app."User" WHERE id = $1',
    [userId],
  );
  return rows[0] ?? null;
}

async function post(client: PoolClient, postId: string) {
  const { rows } = await client.query<{ authorId: string; title: string }>(
    'SELECT "authorId", title FROM app."Post" WHERE id = $1',
    [postId],
  );
  return rows[0] ?? null;
}

async function notify(
  client: PoolClient,
  userId: string,
  kind: string,
  payload: { postId?: string; [key: string]: unknown },
) {
  // postId est recopié en colonne pour filtrer et regrouper les notifications par publication.
  await client.query(
    'INSERT INTO app."Notification" (id, "userId", kind, payload, "postId") VALUES ($1, $2, $3, $4, $5)',
    [uuidv7(), userId, kind, JSON.stringify(payload), payload.postId ?? null],
  );
}

/** Transforme un événement métier en notifications. Jamais de notification pour soi-même. */
async function handle(client: PoolClient, event: OutboxRow) {
  const p = event.payload;
  switch (event.type) {
    case 'comment.created': {
      const target = await post(client, p.postId!);
      if (!target || target.authorId === p.authorId) return;
      await notify(client, target.authorId, 'answer', {
        actor: await actor(client, p.authorId!),
        postId: p.postId,
        postTitle: target.title,
      });
      return;
    }
    case 'comment.accepted': {
      const target = await post(client, p.postId!);
      if (!target || target.authorId === p.answerAuthorId) return;
      await notify(client, p.answerAuthorId!, 'accepted', {
        actor: await actor(client, target.authorId),
        postId: p.postId,
        postTitle: target.title,
      });
      return;
    }
    case 'team.application.created': {
      const target = await post(client, p.postId!);
      if (!target || target.authorId === p.applicantId) return;
      await notify(client, target.authorId, 'application', {
        actor: await actor(client, p.applicantId!),
        postId: p.postId,
        postTitle: target.title,
        role: p.role,
      });
      return;
    }
    case 'team.application.decided': {
      const target = await post(client, p.postId!);
      if (!target) return;
      await notify(
        client,
        p.applicantId!,
        p.decision === 'accept' ? 'application_accepted' : 'application_declined',
        {
          actor: await actor(client, target.authorId),
          postId: p.postId,
          postTitle: target.title,
          role: p.role,
        },
      );
      return;
    }
    case 'user.followed': {
      const follower = await actor(client, p.followerId!);
      // Se désabonner puis se réabonner ne doit pas renvoyer une notification à chaque fois.
      const { rowCount } = await client.query(
        `SELECT 1 FROM app."Notification"
         WHERE "userId" = $1 AND kind = 'follow' AND payload->'actor'->>'handle' = $2
           AND "createdAt" > now() - interval '7 days'
         LIMIT 1`,
        [p.followeeId, follower?.handle ?? ''],
      );
      if (rowCount) return;
      await notify(client, p.followeeId!, 'follow', { actor: follower });
      return;
    }
    default:
      // post.created… : pas de notification pour l'instant.
      return;
  }
}

/**
 * Traite un lot d'événements. `FOR UPDATE SKIP LOCKED` permet de lancer plusieurs workers
 * en parallèle sans qu'un événement soit traité deux fois.
 */
export async function processOutboxBatch(pool: Pool, logger: Logger, size = 50): Promise<number> {
  const client = await pool.connect();
  // Une connexion coupée pendant le lot (réseau, base en veille) émet « error » sur le client :
  // sans gestionnaire, Node arrête tout le worker. La requête en cours échoue et le lot est rejoué.
  let broken = false;
  const onError = (err: Error) => {
    broken = true;
    logger.error({ err }, 'Connexion PostgreSQL perdue pendant le traitement de l’outbox');
  };
  client.on('error', onError);
  try {
    await client.query('BEGIN');
    const { rows } = await client.query<OutboxRow>(
      `SELECT id, type, payload FROM app."OutboxEvent"
       WHERE "processedAt" IS NULL
       ORDER BY "createdAt"
       LIMIT $1
       FOR UPDATE SKIP LOCKED`,
      [size],
    );
    for (const event of rows) {
      try {
        await client.query('SAVEPOINT event');
        await handle(client, event);
        await client.query('RELEASE SAVEPOINT event');
      } catch (err) {
        await client.query('ROLLBACK TO SAVEPOINT event');
        logger.error({ err, eventId: event.id, type: event.type }, 'Événement outbox en échec');
      }
    }
    if (rows.length > 0) {
      await client.query('UPDATE app."OutboxEvent" SET "processedAt" = now() WHERE id = ANY($1)', [
        rows.map((r) => r.id),
      ]);
    }
    await client.query('COMMIT');
    return rows.length;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.off('error', onError);
    // Connexion abîmée : détruite plutôt que rendue au pool.
    client.release(broken);
  }
}
