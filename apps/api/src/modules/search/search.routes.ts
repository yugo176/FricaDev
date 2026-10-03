import { Router } from 'express';
import { z } from 'zod';
import type { SearchService } from './search.service.js';

export function createSearchRouter(deps: { search: SearchService }) {
  const router = Router();
  router.get('/', async (req, res) => {
    const q = z.string().trim().min(2).max(100).parse(req.query.q);
    res.json(await deps.search.search(q));
  });
  return router;
}
