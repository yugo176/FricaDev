import {
  NOTIFICATION_REASON_KEYS,
  NOTIFICATION_VIEWS,
  type NotificationReason,
  type NotificationView,
} from '@fricadev/shared';

/** État de la boîte de réception, entièrement porté par l'URL (partageable, précédent/suivant). */
export interface InboxFilters {
  view: NotificationView;
  unread: boolean;
  reason: NotificationReason | null;
  postId: string | null;
  q: string;
  group: 'date' | 'post';
}

export function parseInboxFilters(search: URLSearchParams): InboxFilters {
  const view = search.get('view');
  const reason = search.get('reason');
  return {
    view: (NOTIFICATION_VIEWS as readonly string[]).includes(view ?? '')
      ? (view as NotificationView)
      : 'inbox',
    unread: search.get('unread') === '1',
    reason: (NOTIFICATION_REASON_KEYS as string[]).includes(reason ?? '')
      ? (reason as NotificationReason)
      : null,
    postId: search.get('postId'),
    q: search.get('q')?.trim().slice(0, 80) ?? '',
    group: search.get('group') === 'post' ? 'post' : 'date',
  };
}

/** Paramètres transmis à l'API (le regroupement ne concerne que l'affichage). */
export function apiParams(filters: InboxFilters): Record<string, string | null> {
  return {
    view: filters.view === 'inbox' ? null : filters.view,
    unread: filters.unread ? '1' : null,
    reason: filters.reason,
    postId: filters.postId,
    q: filters.q || null,
  };
}

export function inboxHref(filters: InboxFilters, patch: Partial<InboxFilters> = {}): string {
  const next = { ...filters, ...patch };
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(apiParams(next))) if (value) query.set(key, value);
  if (next.group === 'post') query.set('group', 'post');
  const qs = query.toString();
  return qs ? `/notifications?${qs}` : '/notifications';
}
