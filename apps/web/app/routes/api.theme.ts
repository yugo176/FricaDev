import { data } from 'react-router';
import type { Route } from './+types/api.theme';
import { THEMES, themeCookie, type Theme } from '~/lib/theme.server';

export async function action({ request }: Route.ActionArgs) {
  const theme = String((await request.formData()).get('theme'));
  if (!(THEMES as readonly string[]).includes(theme)) {
    throw data('Thème inconnu', { status: 400 });
  }
  return data({ theme }, { headers: { 'Set-Cookie': themeCookie(theme as Theme) } });
}
