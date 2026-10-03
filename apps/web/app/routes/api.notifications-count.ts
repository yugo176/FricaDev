import { data } from 'react-router';
import type { Route } from './+types/api.notifications-count';
import { createApi } from '~/lib/api.server';

/** Compteur de la cloche, chargé après l'affichage pour ne pas ralentir chaque page. */
export async function loader({ request }: Route.LoaderArgs) {
  const api = await createApi(request);
  if (!api.profile) return data({ count: 0 });
  try {
    const { count } = await api.call<{ count: number }>('/v1/notifications/unread-count');
    return data({ count }, { headers: await api.headers() });
  } catch {
    return data({ count: 0 }, { headers: await api.headers() });
  }
}
