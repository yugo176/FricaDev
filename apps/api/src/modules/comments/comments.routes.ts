import { Router, type RequestHandler } from 'express';
import { createCommentSchema, updateCommentSchema } from '@fricadev/shared';
import { z } from 'zod';
import type { CommentsService } from './comments.service.js';
import type { UsersService } from '../users/users.service.js';

/** Routes imbriquées sous /v1/posts/:postId/comments */
export function createPostCommentsRouter(deps: {
  comments: CommentsService;
  users: UsersService;
  requireAuth: RequestHandler;
}) {
  const router = Router({ mergeParams: true });

  router.get('/', async (req, res) => {
    const postId = z.uuid().parse((req.params as { postId: string }).postId);
    const viewer = req.auth ? await deps.users.findByIdentity(req.auth.sub) : null;
    res.json(await deps.comments.list(postId, viewer));
  });

  router.post('/', deps.requireAuth, async (req, res) => {
    const postId = z.uuid().parse((req.params as { postId: string }).postId);
    const input = createCommentSchema.parse(req.body);
    const author = await deps.users.requireProfile(req.auth!.sub);
    res.status(201).json(await deps.comments.create(postId, author.id, input));
  });

  return router;
}

/** Actions sur une réponse : /v1/comments/:id/... */
export function createCommentsRouter(deps: {
  comments: CommentsService;
  users: UsersService;
  requireAuth: RequestHandler;
}) {
  const router = Router();
  router.use(deps.requireAuth);

  router.patch('/:id', async (req, res) => {
    const user = await deps.users.requireProfile(req.auth!.sub);
    const { body } = updateCommentSchema.parse(req.body);
    res.json(await deps.comments.update(z.uuid().parse(req.params.id), user, body));
  });

  router.delete('/:id', async (req, res) => {
    const user = await deps.users.requireProfile(req.auth!.sub);
    await deps.comments.remove(z.uuid().parse(req.params.id), user);
    res.status(204).end();
  });

  router.post('/:id/accept', async (req, res) => {
    const user = await deps.users.requireProfile(req.auth!.sub);
    await deps.comments.accept(z.uuid().parse(req.params.id), user.id);
    res.status(204).end();
  });

  router.put('/:id/useful', async (req, res) => {
    const user = await deps.users.requireProfile(req.auth!.sub);
    await deps.comments.vote(z.uuid().parse(req.params.id), user.id, true);
    res.status(204).end();
  });

  router.delete('/:id/useful', async (req, res) => {
    const user = await deps.users.requireProfile(req.auth!.sub);
    await deps.comments.vote(z.uuid().parse(req.params.id), user.id, false);
    res.status(204).end();
  });

  return router;
}
