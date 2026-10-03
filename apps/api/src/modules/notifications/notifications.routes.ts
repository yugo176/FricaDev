import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import {
  bulkNotificationsSchema,
  listNotificationsQuerySchema,
  notificationFiltersSchema,
} from '@fricadev/shared';
import type { NotificationsService } from './notifications.service.js';
import type { UsersService } from '../users/users.service.js';
import { notFound } from '../../lib/errors.js';

export function createNotificationsRouter(deps: {
  notifications: NotificationsService;
  users: UsersService;
  requireAuth: RequestHandler;
}) {
  const router = Router();
  router.use(deps.requireAuth);

  router.get('/', async (req, res) => {
    const user = await deps.users.requireProfile(req.auth!.sub);
    res.json(await deps.notifications.list(user.id, listNotificationsQuerySchema.parse(req.query)));
  });

  router.get('/summary', async (req, res) => {
    const user = await deps.users.requireProfile(req.auth!.sub);
    res.json(await deps.notifications.summary(user.id));
  });

  router.get('/unread-count', async (req, res) => {
    const user = await deps.users.findByIdentity(req.auth!.sub);
    res.json({ count: user ? await deps.notifications.unreadCount(user.id) : 0 });
  });

  router.patch('/', async (req, res) => {
    const user = await deps.users.requireProfile(req.auth!.sub);
    const updated = await deps.notifications.bulk(user.id, bulkNotificationsSchema.parse(req.body));
    res.json({ updated });
  });

  // « Tout marquer comme lu » : limité aux filtres affichés (vue, motif, publication, recherche).
  router.post('/read-all', async (req, res) => {
    const user = await deps.users.requireProfile(req.auth!.sub);
    await deps.notifications.markAllRead(
      user.id,
      notificationFiltersSchema.parse({ ...req.query, ...(req.body ?? {}) }),
    );
    res.status(204).end();
  });

  router.post('/:id/open', async (req, res) => {
    const user = await deps.users.requireProfile(req.auth!.sub);
    const notification = await deps.notifications.open(user.id, z.uuid().parse(req.params.id));
    if (!notification) throw notFound('Notification');
    res.json(notification);
  });

  return router;
}
