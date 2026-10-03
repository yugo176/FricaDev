import { createCookieSessionStorage } from 'react-router';
import { env } from './env.server';

export interface SessionData {
  accessToken: string;
  refreshToken?: string;
  idToken: string;
  expiresAt: number;
  user: { sub: string; name?: string; email?: string };
  /** Profil FricaDev, gardé en session pour éviter un appel à l'API sur chaque page. */
  profile: {
    handle: string;
    displayName: string;
    countryCode: string | null;
    avatarUrl?: string | null;
    role: 'USER' | 'MODERATOR' | 'ADMIN';
  };
}

interface FlashData {
  oidcState: string;
  oidcVerifier: string;
  returnTo: string;
}

/**
 * Pattern « backend for frontend » : les tokens restent dans un cookie httpOnly signé,
 * jamais accessibles au JavaScript du navigateur.
 * À faire évoluer : sessions stockées en base quand les tokens grossiront.
 */
let storage: ReturnType<typeof createCookieSessionStorage<SessionData, FlashData>> | undefined;

export function sessionStorage() {
  storage ??= createCookieSessionStorage<SessionData, FlashData>({
    cookie: {
      name: '__fricadev',
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: env.isProduction,
      secrets: [env.sessionSecret],
      maxAge: 60 * 60 * 24 * 30,
    },
  });
  return storage;
}

export async function getSession(request: Request) {
  return sessionStorage().getSession(request.headers.get('Cookie'));
}
