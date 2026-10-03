import { data } from 'react-router';
import { reactionTypeSchema } from '@fricadev/shared';
import type { Route } from './+types/api.react';
import { ApiError, createApi } from '~/lib/api.server';

/** J'aime / Utile depuis n'importe quelle liste (fil, profil, communauté, recherche, publication). */
export async function action({ request }: Route.ActionArgs) {
  const api = await createApi(request);
  if (!api.profile) return data({ ok: false, error: 'Connecte-toi pour réagir' }, { status: 401 });
  const form = await request.formData();
  const postId = String(form.get('postId') ?? '');
  const type = reactionTypeSchema.safeParse(form.get('type'));
  if (!/^[0-9a-f-]{36}$/.test(postId) || !type.success) {
    return data({ ok: false, error: 'Requête invalide' }, { status: 400 });
  }
  try {
    await api.call(`/v1/posts/${postId}/reactions/${type.data}`, {
      method: form.get('on') === '1' ? 'PUT' : 'DELETE',
    });
    return data({ ok: true, error: null }, { headers: await api.headers() });
  } catch (error) {
    if (error instanceof ApiError) {
      return data(
        { ok: false, error: error.message },
        { status: error.status, headers: await api.headers() },
      );
    }
    throw error;
  }
}
