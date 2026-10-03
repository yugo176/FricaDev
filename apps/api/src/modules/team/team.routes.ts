import { Router, type RequestHandler } from 'express';
import {
  applySchema,
  createOpeningSchema,
  decideApplicationSchema,
  listOpeningsQuerySchema,
} from '@fricadev/shared';
import { z } from 'zod';
import type { TeamService } from './team.service.js';
import type { UsersService } from '../users/users.service.js';

interface Deps {
  team: TeamService;
  users: UsersService;
  requireAuth: RequestHandler;
}

/** /v1/openings, /v1/applications */
export function createTeamRouter({ team, users, requireAuth }: Deps) {
  const router = Router();
  const viewer = async (sub?: string) => (sub ? await users.findByIdentity(sub) : null);

  router.get('/openings', async (req, res) => {
    res.json(
      await team.listOpen(listOpeningsQuerySchema.parse(req.query), await viewer(req.auth?.sub)),
    );
  });

  router.patch('/openings/:id', requireAuth, async (req, res) => {
    const owner = await users.requireProfile(req.auth!.sub);
    const { status } = z.object({ status: z.enum(['OPEN', 'CLOSED']) }).parse(req.body);
    await team.setStatus(z.uuid().parse(req.params.id), owner, status);
    res.status(204).end();
  });

  router.post('/openings/:id/applications', requireAuth, async (req, res) => {
    const applicant = await users.requireProfile(req.auth!.sub);
    const { message } = applySchema.parse(req.body);
    res.status(201).json(await team.apply(z.uuid().parse(req.params.id), applicant, message));
  });

  router.get('/openings/:id/applications', requireAuth, async (req, res) => {
    const owner = await users.requireProfile(req.auth!.sub);
    res.json(await team.listApplications(z.uuid().parse(req.params.id), owner));
  });

  router.post('/applications/:id/decision', requireAuth, async (req, res) => {
    const owner = await users.requireProfile(req.auth!.sub);
    const { decision } = decideApplicationSchema.parse(req.body);
    await team.decide(z.uuid().parse(req.params.id), owner, decision);
    res.status(204).end();
  });

  router.delete('/applications/:id', requireAuth, async (req, res) => {
    const applicant = await users.requireProfile(req.auth!.sub);
    await team.withdraw(z.uuid().parse(req.params.id), applicant);
    res.status(204).end();
  });

  return router;
}

/** /v1/posts/:postId/openings et /v1/posts/:postId/members */
export function createProjectTeamRouter({ team, users, requireAuth }: Deps) {
  const router = Router({ mergeParams: true });
  const postId = (req: { params: unknown }) =>
    z.uuid().parse((req.params as { postId: string }).postId);

  router.get('/openings', async (req, res) => {
    const viewer = req.auth ? await users.findByIdentity(req.auth.sub) : null;
    res.json(await team.listForProject(postId(req), viewer));
  });

  router.post('/openings', requireAuth, async (req, res) => {
    const owner = await users.requireProfile(req.auth!.sub);
    res
      .status(201)
      .json(await team.create(postId(req), owner, createOpeningSchema.parse(req.body)));
  });

  router.get('/members', async (req, res) => {
    res.json(await team.members(postId(req)));
  });

  return router;
}
