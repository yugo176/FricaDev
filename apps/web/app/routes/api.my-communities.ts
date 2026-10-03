import { data } from 'react-router';
import type { CommunityDto } from '@fricadev/shared';
import type { Route } from './+types/api.my-communities';
import { createApi } from '~/lib/api.server';

/** Communautés du menu latéral, chargées seulement à sa première ouverture. */
export async function loader({ request }: Route.LoaderArgs) {
  const api = await createApi(request);
  if (!api.profile) return data({ communities: [] as CommunityDto[] });
  try {
    const communities = await api.call<CommunityDto[]>('/v1/communities/mine');
    return data({ communities }, { headers: await api.headers() });
  } catch {
    return data({ communities: [] as CommunityDto[] }, { headers: await api.headers() });
  }
}
