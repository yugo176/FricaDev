import type { Route } from './+types/api.preview';
import { renderMarkdown } from '~/lib/markdown.server';

/** Aperçu de l'éditeur : le Markdown est rendu par le même moteur que les pages publiées. */
export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const body = String(form.get('body') ?? '').slice(0, 50_000);
  return { html: await renderMarkdown(body) };
}
