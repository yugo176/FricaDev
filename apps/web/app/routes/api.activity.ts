import { data } from 'react-router';
import type { ActivityDto, Page } from '@fricadev/shared';
import type { Route } from './+types/api.activity';
import { requireProfile } from '~/lib/api.server';

const FORWARDED = ['type', 'q', 'cursor'] as const;

/** Pages suivantes de « Mon activité », chargées pendant le défilement. */
export async function loader({ request }: Route.LoaderArgs) {
  const api = await requireProfile(request);
  const url = new URL(request.url);
  const query = new URLSearchParams({ limit: '20' });
  for (const key of FORWARDED) {
    const value = url.searchParams.get(key);
    if (value) query.set(key, value);
  }
  const page = await api.call<Page<ActivityDto>>(`/v1/users/me/activity?${query}`);
  return data(page, {
    headers: { ...(await api.headers()), 'Cache-Control': 'private, no-store' },
  });
}
