import { data } from 'react-router';
import type { Route } from './+types/api.tags';
import { createApi } from '~/lib/api.server';

/** Suggestions de tags pendant la saisie (les plus utilisés d'abord). */
export async function loader({ request }: Route.LoaderArgs) {
  const api = await createApi(request);
  const q = new URL(request.url).searchParams.get('q') ?? '';
  const tags = await api
    .call<{ name: string; count: number }[]>(`/v1/tags?q=${encodeURIComponent(q)}`)
    .catch(() => []);
  return data(tags, { headers: { 'Cache-Control': 'private, max-age=60' } });
}
