import express, { Router, type RequestHandler } from 'express';
import { handleSchema } from '@fricadev/shared';
import { HttpError, notFound } from '../../lib/errors.js';
import { newId } from '../../lib/ids.js';
import { detectImage, type Storage } from '../../lib/storage.js';
import { createProfileSchema, type UsersService } from './users.service.js';

/** Taille maximale d'une photo de profil : le navigateur l'envoie déjà réduite (~20 Ko). */
const AVATAR_MAX_BYTES = 512 * 1024;

export function createUsersRouter(deps: {
  users: UsersService;
  requireAuth: RequestHandler;
  storage: Storage;
}) {
  const router = Router();

  router.put(
    '/me/avatar',
    deps.requireAuth,
    express.raw({ type: ['image/webp', 'image/jpeg', 'image/png'], limit: AVATAR_MAX_BYTES }),
    async (req, res) => {
      const user = await deps.users.requireProfile(req.auth!.sub);
      const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      const image = detectImage(body);
      if (!image) {
        throw new HttpError(415, 'unsupported_image', 'Formats acceptés : WebP, JPEG ou PNG');
      }
      const url = await deps.storage.put(
        `avatars/${user.id}/${newId()}.${image.ext}`,
        body,
        image.mime,
      );
      const previous = user.avatarUrl;
      await deps.users.setAvatar(user.id, url);
      if (previous) await deps.storage.deleteByUrl(previous).catch(() => undefined);
      res.json({ avatarUrl: url });
    },
  );

  router.delete('/me/avatar', deps.requireAuth, async (req, res) => {
    const user = await deps.users.requireProfile(req.auth!.sub);
    if (user.avatarUrl) {
      await deps.users.setAvatar(user.id, null);
      await deps.storage.deleteByUrl(user.avatarUrl).catch(() => undefined);
    }
    res.status(204).end();
  });

  router.get('/me', deps.requireAuth, async (req, res) => {
    const user = await deps.users.findByIdentity(req.auth!.sub);
    res.json({ identityId: req.auth!.sub, profile: user });
  });

  router.put('/me', deps.requireAuth, async (req, res) => {
    const input = createProfileSchema.parse(req.body);
    res.json(await deps.users.upsertProfile(req.auth!.sub, input));
  });

  router.get('/:handle', async (req, res) => {
    const viewer = req.auth ? await deps.users.findByIdentity(req.auth.sub) : null;
    const user = await deps.users.publicProfile(handleSchema.parse(req.params.handle), viewer?.id);
    if (!user) throw notFound('Utilisateur');
    res.json(user);
  });

  router.put('/:handle/follow', deps.requireAuth, async (req, res) => {
    const me = await deps.users.requireProfile(req.auth!.sub);
    await deps.users.setFollow(handleSchema.parse(req.params.handle), me.id, true);
    res.status(204).end();
  });

  router.delete('/:handle/follow', deps.requireAuth, async (req, res) => {
    const me = await deps.users.requireProfile(req.auth!.sub);
    await deps.users.setFollow(handleSchema.parse(req.params.handle), me.id, false);
    res.status(204).end();
  });

  return router;
}
