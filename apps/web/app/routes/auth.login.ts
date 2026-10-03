import { redirect } from 'react-router';
import type { Route } from './+types/auth.login';
import { authorizationUrl, createPkce } from '~/lib/oidc.server';
import { getSession, sessionStorage } from '~/lib/session.server';

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request);
  const { verifier, challenge, state } = createPkce();
  const returnTo = new URL(request.url).searchParams.get('returnTo') ?? '/';

  session.flash('oidcState', state);
  session.flash('oidcVerifier', verifier);
  session.flash('returnTo', returnTo.startsWith('/') ? returnTo : '/');

  return redirect(authorizationUrl({ state, challenge }), {
    headers: { 'Set-Cookie': await sessionStorage().commitSession(session) },
  });
}
