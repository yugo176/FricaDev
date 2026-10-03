import { Router, type RequestHandler } from 'express';
import { COMMUNITY_TYPES } from '@fricadev/shared';
import { z } from 'zod';
import type { CommunitiesService } from './communities.service.js';
import type { UsersService } from '../users/users.service.js';

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9-]{2,60}$/);

export function createCommunitiesRouter(deps: {
  communities: CommunitiesService;
  users: UsersService;
  requireAuth: RequestHandler;
}) {
  const router = Router();
  const viewerId = async (sub?: string) =>
    sub ? (await deps.users.findByIdentity(sub))?.id : undefined;

  router.get('/', async (req, res) => {
    const type = z.enum(COMMUNITY_TYPES).optional().parse(req.query.type);
    res.json(await deps.communities.list(type, await viewerId(req.auth?.sub)));
  });

  router.get('/mine', deps.requireAuth, async (req, res) => {
    const user = await deps.users.requireProfile(req.auth!.sub);
    res.json(await deps.communities.joinedBy(user.id));
  });

  router.get('/:slug', async (req, res) => {
    res.json(
      await deps.communities.get(slugSchema.parse(req.params.slug), await viewerId(req.auth?.sub)),
    );
  });

  router.put('/:slug/membership', deps.requireAuth, async (req, res) => {
    const user = await deps.users.requireProfile(req.auth!.sub);
    res.json(
      await deps.communities.setMembership(slugSchema.parse(req.params.slug), user.id, true),
    );
  });

  router.delete('/:slug/membership', deps.requireAuth, async (req, res) => {
    const user = await deps.users.requireProfile(req.auth!.sub);
    res.json(
      await deps.communities.setMembership(slugSchema.parse(req.params.slug), user.id, false),
    );
  });

  return router;
}
