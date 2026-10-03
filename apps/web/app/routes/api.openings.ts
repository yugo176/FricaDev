import { data } from 'react-router';
import type { OpeningDto, Page } from '@fricadev/shared';
import type { Route } from './+types/api.openings';
import { createApi } from '~/lib/api.server';

/** Pages suivantes de la liste des postes ouverts (défilement infini). */
export async function loader({ request }: Route.LoaderArgs) {
  const api = await createApi(request);
  const url = new URL(request.url);
  const query = new URLSearchParams({ limit: '10' });
  for (const key of ['commitment', 'skill', 'cursor']) {
    const value = url.searchParams.get(key);
    if (value) query.set(key, value);
  }
  const page = await api.call<Page<OpeningDto>>(`/v1/openings?${query}`);
  return data(page, { headers: await api.headers() });
}
