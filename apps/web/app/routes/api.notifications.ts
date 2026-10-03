import { data } from 'react-router';
import type { NotificationDto, Page } from '@fricadev/shared';
import type { Route } from './+types/api.notifications';
import { requireProfile } from '~/lib/api.server';

const FORWARDED = ['view', 'unread', 'reason', 'postId', 'q', 'cursor'] as const;

/** Pages suivantes de la boîte de réception, chargées pendant le défilement. */
export async function loader({ request }: Route.LoaderArgs) {
  const api = await requireProfile(request);
  const url = new URL(request.url);
  const query = new URLSearchParams({ limit: '20' });
  for (const key of FORWARDED) {
    const value = url.searchParams.get(key);
    if (value) query.set(key, value);
  }
  const page = await api.call<Page<NotificationDto>>(`/v1/notifications?${query}`);
  return data(page, { headers: await api.headers() });
}
