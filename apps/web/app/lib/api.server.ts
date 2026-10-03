import { redirect } from 'react-router';
import { env } from './env.server';
import { refreshTokens, TokenRejectedError } from './oidc.server';
import { getSession, sessionStorage, type SessionData } from './session.server';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

/**
 * Client de l'API pour une requête du navigateur : ajoute l'access token de la session
 * et le renouvelle avec le refresh token quand il expire. Si la session a changé,
 * `headers()` renvoie le Set-Cookie à joindre à la réponse.
 */
export async function createApi(request: Request) {
  const session = await getSession(request);
  let changed = false;

  /**
   * Profil gardé en session relu à chaque renouvellement du jeton (au plus tard toutes les 15 min) :
   * un rôle donné par `set-role` ou une photo changée ailleurs apparaissent sans reconnexion.
   */
  async function refreshProfile(token: string) {
    try {
      const res = await fetch(new URL('/v1/users/me', env.apiInternalUrl), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const { profile } = (await res.json()) as {
        profile: (SessionData['profile'] & { avatarUrl?: string | null }) | null;
      };
      if (!profile) return;
      session.set('profile', {
        handle: profile.handle,
        displayName: profile.displayName,
        countryCode: profile.countryCode,
        avatarUrl: profile.avatarUrl ?? null,
        role: profile.role,
      });
    } catch {
      // Profil inchangé : ce n'est qu'une mise à jour d'affichage.
    }
  }

  async function accessToken(): Promise<string | null> {
    const token = session.get('accessToken');
    if (!token) return null;
    if ((session.get('expiresAt') ?? 0) - 30_000 > Date.now()) return token;
    const refreshToken = session.get('refreshToken');
    changed = true;
    if (!refreshToken) {
      session.unset('accessToken');
      return null;
    }
    try {
      const tokens = await refreshTokens(refreshToken);
      session.set('accessToken', tokens.access_token);
      if (tokens.refresh_token) session.set('refreshToken', tokens.refresh_token);
      session.set('expiresAt', Date.now() + tokens.expires_in * 1000);
      await refreshProfile(tokens.access_token);
      return tokens.access_token;
    } catch (error) {
      // Panne passagère (réseau lent, délai dépassé) : la session est gardée, on réessaiera
      // à la requête suivante. Seul un vrai refus du service d'identité déconnecte.
      if (!(error instanceof TokenRejectedError)) return null;
      session.unset('accessToken');
      session.unset('refreshToken');
      session.unset('user');
      session.unset('profile');
      return null;
    }
  }

  async function call<T>(
    path: string,
    init: { method?: string; body?: unknown; raw?: { data: Blob; contentType: string } } = {},
  ): Promise<T> {
    const token = await accessToken();
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    let body: BodyInit | undefined;
    if (init.raw) {
      headers['Content-Type'] = init.raw.contentType;
      body = init.raw.data;
    } else if (init.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(init.body);
    }
    const res = await fetch(new URL(path, env.apiInternalUrl), {
      method: init.method ?? 'GET',
      headers,
      body,
      signal: AbortSignal.timeout(15_000),
    });
    if (res.status === 204) return undefined as T;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = (data as { error?: { code: string; message: string; details?: unknown } })
        .error;
      throw new ApiError(
        res.status,
        error?.code ?? 'error',
        error?.message ?? 'Erreur',
        error?.details,
      );
    }
    return data as T;
  }

  return {
    session,
    get user() {
      return session.get('user') ?? null;
    },
    get profile() {
      return session.get('profile') ?? null;
    },
    isAuthenticated: () => Boolean(session.get('accessToken')),
    call,
    markChanged: () => {
      changed = true;
    },
    async headers(): Promise<HeadersInit> {
      return changed ? { 'Set-Cookie': await sessionStorage().commitSession(session) } : {};
    },
  };
}

export type Api = Awaited<ReturnType<typeof createApi>>;

/** Redirige vers la connexion (puis revient ici) si le visiteur n'est pas connecté. */
export async function requireUser(request: Request) {
  const api = await createApi(request);
  if (!api.isAuthenticated()) {
    const url = new URL(request.url);
    throw redirect(`/auth/login?returnTo=${encodeURIComponent(url.pathname + url.search)}`);
  }
  return api;
}

/** Comme requireUser, et exige en plus un profil FricaDev complet. */
export async function requireProfile(request: Request) {
  const api = await requireUser(request);
  if (!api.profile) throw redirect('/onboarding', { headers: await api.headers() });
  return api;
}
