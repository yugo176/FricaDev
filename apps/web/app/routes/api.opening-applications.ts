import { data } from 'react-router';
import type { ApplicationDto } from '@fricadev/shared';
import type { Route } from './+types/api.opening-applications';
import { requireProfile } from '~/lib/api.server';

/** Candidatures d'un poste, chargées à la demande par l'auteur du projet. */
export async function loader({ request, params }: Route.LoaderArgs) {
  const api = await requireProfile(request);
  const applications = await api.call<ApplicationDto[]>(`/v1/openings/${params.id}/applications`);
  return data(applications, { headers: await api.headers() });
}
