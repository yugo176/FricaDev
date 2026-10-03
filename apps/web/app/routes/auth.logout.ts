import { redirect } from 'react-router';
import type { Route } from './+types/auth.logout';
import { logoutUrl } from '~/lib/oidc.server';
import { getSession, sessionStorage } from '~/lib/session.server';

export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request);
  const idToken = session.get('idToken');
  const headers = { 'Set-Cookie': await sessionStorage().destroySession(session) };
  return redirect(idToken ? logoutUrl(idToken) : '/', { headers });
}

export const loader = () => redirect('/');
