import { data, Form } from 'react-router';
import { Search, SearchX } from 'lucide-react';
import type { SearchResultsDto } from '@fricadev/shared';
import type { Route } from './+types/search';
import { PostCards } from '~/components/infinite-feed';
import { TagList } from '~/components/post-card';
import {
  Button,
  EmptyState,
  Input,
  PageContainer,
  PageHeader,
  SectionTitle,
} from '~/components/ui';
import { UserCard } from '~/components/user-card';
import { createApi } from '~/lib/api.server';

export function meta({ data: loaderData }: Route.MetaArgs) {
  return [
    { title: loaderData?.q ? `« ${loaderData.q} » · Recherche FricaDev` : 'Recherche · FricaDev' },
    { name: 'robots', content: 'noindex' },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const api = await createApi(request);
  const q = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  const results =
    q.length >= 2
      ? await api.call<SearchResultsDto>(`/v1/search?q=${encodeURIComponent(q)}`)
      : null;
  return data({ q, results }, { headers: await api.headers() });
}

export default function SearchPage({ loaderData }: Route.ComponentProps) {
  const { q, results } = loaderData;
  const nothing = results && !results.posts.length && !results.users.length && !results.tags.length;

  return (
    <PageContainer>
      <PageHeader icon={<Search size={26} aria-hidden />} title="Recherche" />
      <Form method="get" role="search" className="flex gap-2">
        <Input
          name="q"
          defaultValue={q}
          autoFocus
          minLength={2}
          aria-label="Rechercher"
          placeholder="Une question, un dev, une technologie…"
          className="h-12 text-base"
        />
        <Button size="lg">Chercher</Button>
      </Form>

      <div className="mt-8 space-y-10">
        {results === null && q && (
          <p className="text-sm text-stone-500">Tape au moins 2 caractères.</p>
        )}
        {nothing && (
          <EmptyState
            icon={<SearchX size={22} aria-hidden />}
            title={`Aucun résultat pour « ${q} »`}
            description="Essaie un autre mot, un tag (react, laravel…) ou un pseudo."
          />
        )}

        {results && results.tags.length > 0 && (
          <section>
            <SectionTitle>Tags</SectionTitle>
            <TagList tags={results.tags} size="md" />
          </section>
        )}

        {results && results.users.length > 0 && (
          <section>
            <SectionTitle>Développeurs</SectionTitle>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {results.users.map((user) => (
                <UserCard key={user.handle} user={user} />
              ))}
            </div>
          </section>
        )}

        {results && results.posts.length > 0 && (
          <section>
            <SectionTitle>Publications</SectionTitle>
            <div className="space-y-3">
              <PostCards posts={results.posts} />
            </div>
          </section>
        )}
      </div>
    </PageContainer>
  );
}

export { keepPageOnReaction as shouldRevalidate } from '~/lib/revalidate';
