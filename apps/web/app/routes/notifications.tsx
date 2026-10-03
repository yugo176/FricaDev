import { data, Link } from 'react-router';
import { Archive, Bell, Info, PartyPopper, Pin, SearchX } from 'lucide-react';
import {
  NOTIFICATION_ACTIONS,
  type NotificationAction,
  type NotificationDto,
  type NotificationsSummaryDto,
  type Page,
} from '@fricadev/shared';
import type { Route } from './+types/notifications';
import { InfiniteList, toQuery } from '~/components/infinite-list';
import {
  apiParams,
  inboxHref,
  parseInboxFilters,
  type InboxFilters,
} from '~/components/notifications/filters';
import { NotificationList } from '~/components/notifications/notification-list';
import { REASON_UI } from '~/components/notifications/notification-kinds';
import { NotificationsSidebar } from '~/components/notifications/notifications-sidebar';
import { NotificationsToolbar } from '~/components/notifications/notifications-toolbar';
import { EmptyState, PageContainer, PageHeader, Skeleton } from '~/components/ui';
import { requireProfile } from '~/lib/api.server';

export const meta = () => [{ title: 'Notifications · FricaDev' }];

export async function loader({ request }: Route.LoaderArgs) {
  const api = await requireProfile(request);
  const filters = parseInboxFilters(new URL(request.url).searchParams);
  const query = toQuery({ ...apiParams(filters), limit: '20' });
  const [page, summary] = await Promise.all([
    api.call<Page<NotificationDto>>(`/v1/notifications?${query}`),
    api.call<NotificationsSummaryDto>('/v1/notifications/summary'),
  ]);
  return data({ page, summary, filters }, { headers: await api.headers() });
}

export async function action({ request }: Route.ActionArgs) {
  const api = await requireProfile(request);
  const form = await request.formData();
  const intent = form.get('intent');
  if (intent === 'bulk') {
    const action = String(form.get('action')) as NotificationAction;
    const ids = JSON.parse(String(form.get('ids') ?? '[]')) as string[];
    if (!NOTIFICATION_ACTIONS.includes(action)) throw data('Action inconnue', { status: 400 });
    await api.call('/v1/notifications', { method: 'PATCH', body: { ids, action } });
  } else if (intent === 'read-all') {
    const filters: Record<string, string> = {};
    for (const key of ['view', 'unread', 'reason', 'postId', 'q']) {
      const value = form.get(key);
      if (typeof value === 'string' && value) filters[key] = value;
    }
    await api.call('/v1/notifications/read-all', { method: 'POST', body: filters });
  }
  return data({ ok: true }, { headers: await api.headers() });
}

/** Une phrase pour dire à quoi sert la vue : tout le monde ne connaît pas « épingler » / « archiver ». */
const VIEW_HINTS: Partial<Record<InboxFilters['view'], string>> = {
  pinned:
    'Les notifications que tu gardes sous la main, comme une discussion épinglée sur WhatsApp. Elles restent ici même archivées.',
  archived:
    'Les notifications déjà traitées, sorties de la boîte de réception. Rien n’est supprimé : remets-en une dans la boîte quand tu veux.',
};

function RowSkeleton() {
  return (
    <div className="card flex items-center gap-3 px-4 py-3" aria-hidden>
      <Skeleton className="h-4 w-4 rounded" />
      <Skeleton className="h-9 w-9 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-2.5 w-32" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  );
}

function Empty({ filters }: { filters: InboxFilters }) {
  if (filters.q || filters.reason || filters.postId || filters.unread) {
    return (
      <EmptyState
        icon={<SearchX size={22} aria-hidden />}
        title="Aucune notification ne correspond"
        description={
          filters.q
            ? `Rien pour « ${filters.q} » avec ces filtres.`
            : filters.reason
              ? `Aucune notification « ${REASON_UI[filters.reason].label} » ici.`
              : 'Essaie d’enlever un filtre.'
        }
        action={
          <Link
            to={inboxHref(filters, { q: '', reason: null, postId: null, unread: false })}
            className="btn-secondary btn-md"
          >
            Effacer les filtres
          </Link>
        }
      />
    );
  }
  if (filters.view === 'pinned') {
    return (
      <EmptyState
        icon={<Pin size={22} aria-hidden />}
        title="Aucune notification épinglée"
        description="Épingle une notification importante (une candidature à traiter, une réponse à relire) : elle t’attendra ici."
      />
    );
  }
  if (filters.view === 'archived') {
    return (
      <EmptyState
        icon={<Archive size={22} aria-hidden />}
        title="Aucune notification archivée"
        description="Archive ce que tu as déjà traité pour garder une boîte de réception propre. Rien n’est supprimé : tout reste ici."
      />
    );
  }
  return (
    <EmptyState
      icon={<PartyPopper size={22} aria-hidden />}
      title="Tout est lu, bravo !"
      description="Réponds à des questions et partage tes projets : la communauté te répondra ici."
    />
  );
}

export default function Notifications({ loaderData }: Route.ComponentProps) {
  const { page, summary, filters } = loaderData;
  return (
    <PageContainer size="xl">
      <PageHeader
        icon={<Bell size={26} aria-hidden />}
        title="Notifications"
        description={
          summary.unread
            ? `${summary.unread} non lue${summary.unread > 1 ? 's' : ''} dans ta boîte de réception.`
            : 'Ta boîte de réception est à jour.'
        }
      />
      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <div className="min-w-0">
          <NotificationsSidebar summary={summary} filters={filters} />
        </div>
        <div className="min-w-0 space-y-4">
          <NotificationsToolbar filters={filters} />
          {VIEW_HINTS[filters.view] && (
            <p className="flex items-start gap-2 rounded-xl bg-stone-100 px-3.5 py-2.5 text-[13px] text-stone-600 dark:bg-stone-900 dark:text-stone-400">
              <Info size={15} className="mt-0.5 shrink-0 text-stone-400" aria-hidden />
              {VIEW_HINTS[filters.view]}
            </p>
          )}
          <InfiniteList
            initial={page}
            endpoint="/api/notifications"
            params={apiParams(filters)}
            resetOnRevalidate={false}
            empty={<Empty filters={filters} />}
            skeleton={<RowSkeleton />}
            endLabel="Plus de notifications"
            renderItems={(items) => (
              <NotificationList
                items={items}
                filters={filters}
                empty={<Empty filters={filters} />}
              />
            )}
          />
        </div>
      </div>
    </PageContainer>
  );
}
