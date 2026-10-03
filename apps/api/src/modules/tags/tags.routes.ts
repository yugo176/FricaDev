import { Router } from 'express';
import { z } from 'zod';
import type { TagsService } from './tags.service.js';

export function createTagsRouter(deps: { tags: TagsService }) {
  const router = Router();
  router.get('/', async (req, res) => {
    const q = z
      .string()
      .trim()
      .toLowerCase()
      .max(32)
      .regex(/^[a-z0-9.+#-]*$/)
      .catch('')
      .parse(req.query.q ?? '');
    // Les tags changent peu : un cache court soulage la base pendant la frappe.
    res.set('Cache-Control', 'public, max-age=60');
    res.json(await deps.tags.suggest(q));
  });
  return router;
}
