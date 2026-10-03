import { data, redirect } from 'react-router';
import { POST_TYPES, type CommunityDto, type PostDto, type PostType } from '@fricadev/shared';
import type { Route } from './+types/new';
import { PostForm } from '~/components/post-form';
import { PageContainer, PageHeader } from '~/components/ui';
import { requireProfile } from '~/lib/api.server';
import { apiErrorToActionData, postFieldsFromForm } from '~/lib/forms.server';

export const meta = () => [{ title: 'Publier · FricaDev' }];

export async function loader({ request }: Route.LoaderArgs) {
  const api = await requireProfile(request);
  const url = new URL(request.url);
  const type = url.searchParams.get('type');
  const initialType = (POST_TYPES as readonly string[]).includes(type ?? '')
    ? (type as PostType)
    : 'QUESTION';
  const communities = await api.call<CommunityDto[]>('/v1/communities').catch(() => []);
  return data(
    {
      initialType,
      initialCommunity: url.searchParams.get('community') ?? '',
      // Communautés rejointes d'abord.
      communities: [...communities].sort(
        (a, b) => Number(Boolean(b.viewer?.isMember)) - Number(Boolean(a.viewer?.isMember)),
      ),
    },
    { headers: await api.headers() },
  );
}

export async function action({ request }: Route.ActionArgs) {
  const api = await requireProfile(request);
  const form = await request.formData();
  try {
    const post = await api.call<PostDto>('/v1/posts', {
      method: 'POST',
      body: { ...postFieldsFromForm(form), communityId: form.get('communityId') || undefined },
    });
    // « Je cherche des coéquipiers » : on enchaîne sur la description du poste.
    const next =
      post.type === 'PROJECT' && form.get('lookingForTeam')
        ? `/p/${post.id}?ouvrir-poste=1#equipe`
        : `/p/${post.id}`;
    return redirect(next, { headers: await api.headers() });
  } catch (error) {
    return apiErrorToActionData(error, await api.headers());
  }
}

export default function NewPost({ loaderData, actionData }: Route.ComponentProps) {
  return (
    <PageContainer size="xl">
      <PageHeader
        title="Publier"
        description="Partage avec les devs de tout le continent : une question, un projet, du code ou un article."
      />
      <PostForm
        mode="create"
        initial={{ type: loaderData.initialType, communityId: loaderData.initialCommunity }}
        communities={loaderData.communities}
        errors={actionData?.fieldErrors}
        formError={actionData?.error}
        cancelHref="/"
      />
    </PageContainer>
  );
}
