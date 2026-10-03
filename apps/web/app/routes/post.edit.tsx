import { data, redirect } from 'react-router';
import type { PostDto } from '@fricadev/shared';
import type { Route } from './+types/post.edit';
import { PostForm } from '~/components/post-form';
import { PageContainer, PageHeader } from '~/components/ui';
import { ApiError, requireProfile } from '~/lib/api.server';
import { apiErrorToActionData, postFieldsFromForm } from '~/lib/forms.server';
import { POST_TYPE_UI } from '~/lib/post-types';

export const meta = () => [{ title: 'Modifier · FricaDev' }];

export async function loader({ request, params }: Route.LoaderArgs) {
  const api = await requireProfile(request);
  try {
    const post = await api.call<PostDto>(`/v1/posts/${params.id}`);
    if (!post.viewer?.isAuthor) throw redirect(`/p/${params.id}`);
    return data({ post }, { headers: await api.headers() });
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) {
      throw data('Publication introuvable', { status: 404 });
    }
    throw error;
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  const api = await requireProfile(request);
  const form = await request.formData();
  try {
    await api.call(`/v1/posts/${params.id}`, {
      method: 'PATCH',
      body: (({ title, body, tags, details }) => ({ title, body, tags, details }))(
        postFieldsFromForm(form),
      ),
    });
    return redirect(`/p/${params.id}`, { headers: await api.headers() });
  } catch (error) {
    return apiErrorToActionData(error, await api.headers());
  }
}

export default function EditPost({ loaderData, actionData }: Route.ComponentProps) {
  const { post } = loaderData;
  return (
    <PageContainer size="xl">
      <PageHeader
        title="Modifier la publication"
        description={`Type : ${POST_TYPE_UI[post.type].label}`}
      />
      <PostForm
        mode="edit"
        initial={{
          type: post.type,
          title: post.title,
          body: post.body,
          tags: post.tags,
          details: post.details,
        }}
        errors={actionData?.fieldErrors}
        formError={actionData?.error}
        cancelHref={`/p/${post.id}`}
      />
    </PageContainer>
  );
}
