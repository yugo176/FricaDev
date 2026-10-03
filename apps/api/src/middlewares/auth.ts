import type { NextFunction, Request, Response } from 'express';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import type { Env } from '../config/env.js';
import { unauthorized } from '../lib/errors.js';

export interface AuthContext {
  sub: string;
  scope: string[];
}

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthContext;
  }
}

/**
 * Valide les access tokens JWT émis par le service d'identité (FricaDev ou, demain,
 * n'importe quel client « Se connecter avec FricaDev »). Aucun appel réseau par requête :
 * les clés publiques sont mises en cache par jose.
 */
export function createAuthMiddleware(env: Env) {
  const jwks = createRemoteJWKSet(new URL(env.AUTH_JWKS_URL ?? new URL('/jwks', env.AUTH_ISSUER)));

  async function verify(token: string): Promise<JWTPayload> {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: env.AUTH_ISSUER,
      audience: env.API_AUDIENCE,
    });
    return payload;
  }

  const optionalAuth = async (req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return next();
    try {
      const payload = await verify(header.slice('Bearer '.length));
      req.auth = {
        sub: String(payload.sub),
        scope: typeof payload.scope === 'string' ? payload.scope.split(' ') : [],
      };
      next();
    } catch {
      next(unauthorized());
    }
  };

  const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(unauthorized());
    next();
  };

  return { optionalAuth, requireAuth };
}
