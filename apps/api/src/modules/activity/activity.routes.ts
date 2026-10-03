import { Router, type RequestHandler } from 'express';
import { activityQuerySchema } from '@fricadev/shared';
import type { ActivityService } from './activity.service.js';
import type { UsersService } from '../users/users.service.js';

/** « Mon activité » : historique privé, réservé à la personne connectée. */
export function createActivityRouter(deps: {
  activity: ActivityService;
  users: UsersService;
  requireAuth: RequestHandler;
}) {
  const router = Router();
  router.use(deps.requireAuth);

  router.get('/', async (req, res) => {
    res.set('Cache-Control', 'private, no-store');
    const user = await deps.users.requireProfile(req.auth!.sub);
    res.json(await deps.activity.list(user.id, activityQuerySchema.parse(req.query)));
  });

  router.get('/summary', async (req, res) => {
    res.set('Cache-Control', 'private, no-store');
    const user = await deps.users.requireProfile(req.auth!.sub);
    res.json(await deps.activity.summary(user.id));
  });

  return router;
}
