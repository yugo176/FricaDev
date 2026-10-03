import { Router, type RequestHandler } from 'express';
import {
  createPostSchema,
  listPostsQuerySchema,
  reactionTypeSchema,
  updatePostSchema,
  viewerReactionsQuerySchema,
} from '@fricadev/shared';
import { z } from 'zod';
import type { PostsService } from './posts.service.js';
import type { UsersService } from '../users/users.service.js';

export function createPostsRouter(deps: {
  posts: PostsService;
  users: UsersService;
  requireAuth: RequestHandler;
}) {
  const router = Router();

  /** Profil FricaDev du visiteur authentifié, s'il en a un. */
  const viewer = async (sub?: string) => (sub ? await deps.users.findByIdentity(sub) : null);

  router.get('/', async (req, res) => {
    // Le fil public est identique pour tous : un cache court absorbe les pics de trafic.
    res.set('Cache-Control', 'public, max-age=15, stale-while-revalidate=60');
    res.json(await deps.posts.list(listPostsQuerySchema.parse(req.query)));
  });

  router.get('/following', deps.requireAuth, async (req, res) => {
    const user = await deps.users.requireProfile(req.auth!.sub);
    res.json(await deps.posts.following(user.id, listPostsQuerySchema.parse(req.query)));
  });

  // Réactions du visiteur sur une page du fil : séparé du fil public pour que celui-ci reste en cache.
  router.get('/viewer-reactions', deps.requireAuth, async (req, res) => {
    res.set('Cache-Control', 'private, no-store');
    const { ids } = viewerReactionsQuerySchema.parse(req.query);
    const user = await deps.users.findByIdentity(req.auth!.sub);
    res.json(user ? await deps.posts.viewerReactions(ids, user.id) : {});
  });

  router.get('/:id', async (req, res) => {
    const id = z.uuid().parse(req.params.id);
    res.json(await deps.posts.get(id, await viewer(req.auth?.sub)));
  });

  router.post('/', deps.requireAuth, async (req, res) => {
    const input = createPostSchema.parse(req.body);
    const author = await deps.users.requireProfile(req.auth!.sub);
    res.status(201).json(await deps.posts.create(author.id, input));
  });

  router.put('/:id/reactions/:type', deps.requireAuth, async (req, res) => {
    const id = z.uuid().parse(req.params.id);
    const type = reactionTypeSchema.parse(req.params.type);
    const user = await deps.users.requireProfile(req.auth!.sub);
    res.json(await deps.posts.react(id, user, type, true));
  });

  router.delete('/:id/reactions/:type', deps.requireAuth, async (req, res) => {
    const id = z.uuid().parse(req.params.id);
    const type = reactionTypeSchema.parse(req.params.type);
    const user = await deps.users.requireProfile(req.auth!.sub);
    res.json(await deps.posts.react(id, user, type, false));
  });

  router.patch('/:id', deps.requireAuth, async (req, res) => {
    const id = z.uuid().parse(req.params.id);
    const input = updatePostSchema.parse(req.body);
    const user = await deps.users.requireProfile(req.auth!.sub);
    res.json(await deps.posts.update(id, user, input));
  });

  router.delete('/:id', deps.requireAuth, async (req, res) => {
    const id = z.uuid().parse(req.params.id);
    const user = await deps.users.requireProfile(req.auth!.sub);
    await deps.posts.remove(id, user);
    res.status(204).end();
  });

  return router;
}
