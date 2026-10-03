import { redirect } from 'react-router';
import type { NotificationDto } from '@fricadev/shared';
import type { Route } from './+types/notifications.open';
import { notificationTarget } from '~/components/notifications/notification-kinds';
import { ApiError, requireProfile } from '~/lib/api.server';

/** Clic sur une notification : marquée comme lue, puis ouverture de sa cible (marche sans JavaScript). */
export async function loader({ request, params }: Route.LoaderArgs) {
  const api = await requireProfile(request);
  try {
    const notification = await api.call<NotificationDto>(`/v1/notifications/${params.id}/open`, {
      method: 'POST',
    });
    return redirect(notificationTarget(notification), { headers: await api.headers() });
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) {
      return redirect('/notifications', { headers: await api.headers() });
    }
    throw error;
  }
}
