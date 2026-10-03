import { data } from 'react-router';
import type { PostType, SearchResultsDto } from '@fricadev/shared';
import type { Route } from './+types/api.similar';
import { createApi } from '~/lib/api.server';

/** Mots trop courants pour distinguer deux publications. */
const STOP_WORDS = new Set(
  'comment pour avec dans sans sur sous faire fait quel quelle quels quelles est sont une des les mon mes ton tes son ses notre votre leur leurs plus moins entre depuis quand pourquoi quoi cette ceci cela comme mais donc alors tout tous toute toutes bien aussi encore lorsque peut doit être avoir test'.split(
    ' ',
  ),
);

function keywords(title: string) {
  const words = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9#+.]+/)
    .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));
  // Les mots les plus longs sont souvent les plus parlants (webhook, paiement, laravel…).
  return [...new Set(words)].sort((a, b) => b.length - a.length).slice(0, 5);
}

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Publications du même type qui ressemblent au titre en cours de saisie (éviter les doublons). */
export async function loader({ request }: Route.LoaderArgs) {
  const api = await createApi(request);
  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim() ?? '';
  const type = url.searchParams.get('type') as PostType | null;
  const words = keywords(q);
  if (q.length < 12 || words.length === 0) return data([]);

  // Recherche « l'un ou l'autre » des mots-clés, puis tri par nombre de mots en commun.
  const results = await api
    .call<SearchResultsDto>(`/v1/search?q=${encodeURIComponent(words.join(' or '))}`)
    .catch(() => null);
  const needed = words.length >= 3 ? 2 : 1;
  const posts = (results?.posts ?? [])
    .filter((p) => !type || p.type === type)
    .map((p) => {
      const title = normalize(p.title);
      return { p, score: words.filter((w) => title.includes(w)).length };
    })
    .filter(({ score }) => score >= needed)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ p }) => ({ id: p.id, title: p.title, commentCount: p.commentCount, type: p.type }));
  return data(posts, { headers: { 'Cache-Control': 'private, max-age=30' } });
}
