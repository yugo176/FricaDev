import { Router, type RequestHandler } from 'express';
import { createReportSchema, resolveReportSchema } from '@fricadev/shared';
import { z } from 'zod';
import { HttpError } from '../../lib/errors.js';
import { canModerate } from '../../lib/quota.js';
import type { ModerationService } from './moderation.service.js';
import type { UsersService } from '../users/users.service.js';

export function createModerationRouter(deps: {
  moderation: ModerationService;
  users: UsersService;
  requireAuth: RequestHandler;
}) {
  const router = Router();
  router.use(deps.requireAuth);

  async function requireModerator(sub: string) {
    const user = await deps.users.requireProfile(sub);
    if (!canModerate(user)) throw new HttpError(403, 'forbidden', 'Réservé à la modération');
    return user;
  }

  /** Tout membre peut signaler un contenu. */
  router.post('/reports', async (req, res) => {
    const user = await deps.users.requireProfile(req.auth!.sub);
    await deps.moderation.report(user.id, createReportSchema.parse(req.body));
    res.status(201).json({ ok: true });
  });

  router.get('/queue', async (req, res) => {
    await requireModerator(req.auth!.sub);
    res.json(await deps.moderation.queue());
  });

  router.post('/targets/:type/:id', async (req, res) => {
    const moderator = await requireModerator(req.auth!.sub);
    const type = z.enum(['POST', 'COMMENT']).parse(req.params.type);
    const id = z.uuid().parse(req.params.id);
    const { action } = resolveReportSchema.parse(req.body);
    await deps.moderation.resolve({ type, id }, moderator.id, action);
    res.status(204).end();
  });

  return router;
}
