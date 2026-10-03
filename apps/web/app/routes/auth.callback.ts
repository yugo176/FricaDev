import { redirect } from 'react-router';
import type { Route } from './+types/auth.callback';
import { decodeIdToken, exchangeCode } from '~/lib/oidc.server';
import { createApi } from '~/lib/api.server';

interface MeResponse {
  profile: {
    handle: string;
    displayName: string;
    countryCode: string | null;
    avatarUrl?: string | null;
    role: 'USER' | 'MODERATOR' | 'ADMIN';
  } | null;
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const api = await createApi(request);
  const { session } = api;
  const expectedState = session.get('oidcState');
  const verifier = session.get('oidcVerifier');
  const returnTo = session.get('returnTo') ?? '/';
  const code = url.searchParams.get('code');

  if (!code || !verifier || url.searchParams.get('state') !== expectedState) {
    throw new Response('Connexion invalide ou expirée. Réessaie.', { status: 400 });
  }

  const tokens = await exchangeCode(code, verifier);
  session.set('accessToken', tokens.access_token);
  session.set('refreshToken', tokens.refresh_token);
  session.set('idToken', tokens.id_token);
  session.set('expiresAt', Date.now() + tokens.expires_in * 1000);
  session.set('user', decodeIdToken(tokens.id_token));
  api.markChanged();

  // Premier passage : le compte existe mais pas encore le profil FricaDev.
  const { profile } = await api.call<MeResponse>('/v1/users/me');
  if (profile) {
    session.set('profile', {
      handle: profile.handle,
      displayName: profile.displayName,
      countryCode: profile.countryCode,
      avatarUrl: profile.avatarUrl ?? null,
      role: profile.role,
    });
  } else {
    session.unset('profile');
  }

  const destination = profile ? returnTo : `/onboarding?returnTo=${encodeURIComponent(returnTo)}`;
  return redirect(destination, { headers: await api.headers() });
}
