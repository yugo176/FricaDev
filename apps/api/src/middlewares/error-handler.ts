import type { NextFunction, Request, Response } from 'express';
import { ZodError, z } from 'zod';
import { HttpError } from '../lib/errors.js';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { code: 'not_found', message: 'Route introuvable' } });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'validation_error',
        message: 'Données invalides',
        details: z.flattenError(err),
      },
    });
  }
  if (err instanceof HttpError) {
    return res
      .status(err.status)
      .json({ error: { code: err.code, message: err.message, details: err.details } });
  }
  // Erreurs des lecteurs de corps de requête (fichier trop lourd, JSON invalide…).
  const parserError = err as { type?: string; status?: number };
  if (parserError.type === 'entity.too.large') {
    return res
      .status(413)
      .json({ error: { code: 'too_large', message: 'Fichier ou contenu trop volumineux' } });
  }
  if (parserError.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'bad_request', message: 'Requête invalide' } });
  }
  req.log?.error({ err }, 'Erreur non gérée');
  return res.status(500).json({ error: { code: 'internal_error', message: 'Erreur interne' } });
}
