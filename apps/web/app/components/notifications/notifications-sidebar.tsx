import { Link, useNavigate } from 'react-router';
import { Archive, FileText, Inbox, Pin } from 'lucide-react';
import { NOTIFICATION_REASON_KEYS, type NotificationsSummaryDto } from '@fricadev/shared';
import { cn } from '../ui';
import { inboxHref, type InboxFilters } from './filters';
import { REASON_UI } from './notification-kinds';

function Count({ value, strong }: { value: number; strong?: boolean }) {
  if (!value) return null;
  return (
    <span
      className={cn(
        'ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums',
        strong
          ? 'bg-brand-600 text-white'
          : 'bg-stone-200/80 text-stone-600 dark:bg-stone-800 dark:text-stone-300',
      )}
    >
      {value > 99 ? '99+' : value}
    </span>
  );
}

function SideLink({
  to,
  active,
  icon,
  label,
  count,
  strong,
}: {
  to: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  count?: number;
  strong?: boolean;
}) {
  return (
    <li>
      <Link
        to={to}
        preventScrollReset
        aria-current={active ? 'page' : undefined}
        className={cn(
          'relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm transition',
          active
            ? 'bg-stone-100 font-semibold text-stone-900 dark:bg-stone-800 dark:text-white'
            : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800/70 dark:hover:text-white',
        )}
      >
        {active && (
          <span
            className="absolute -left-2 top-1.5 h-6 w-1 rounded-r-full bg-brand-600"
            aria-hidden
          />
        )}
        <span className={active ? 'text-brand-600' : 'text-stone-400'}>{icon}</span>
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <Count value={count ?? 0} strong={strong} />
      </Link>
    </li>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 mt-5 px-2.5 text-xs font-semibold uppercase tracking-wider text-stone-400">
      {children}
    </p>
  );
}

/** Barre latérale de la boîte de réception (bureau) ; pastilles défilantes sur mobile. */
export function NotificationsSidebar({
  summary,
  filters,
}: {
  summary: NotificationsSummaryDto;
  filters: InboxFilters;
}) {
  const navigate = useNavigate();
  // Changer de vue repart d'une liste sans filtre de motif ni de publication.
  const views = [
    {
      view: 'inbox' as const,
      label: 'Boîte de réception',
      icon: <Inbox size={17} aria-hidden />,
      count: summary.unread,
      strong: true,
    },
    {
      view: 'pinned' as const,
      label: 'Épinglées',
      icon: <Pin size={17} aria-hidden />,
      count: summary.pinned,
    },
    {
      view: 'archived' as const,
      label: 'Archivées',
      icon: <Archive size={17} aria-hidden />,
    },
  ];
  const isView = (view: InboxFilters['view']) =>
    filters.view === view && !filters.reason && !filters.postId;

  return (
    <>
      {/* Mobile : pastilles */}
      <nav
        aria-label="Vues et filtres des notifications"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden"
      >
        {views.map((v) => (
          <MobilePill
            key={v.view}
            to={inboxHref(filters, { view: v.view, reason: null, postId: null })}
            active={isView(v.view)}
            label={v.label}
            count={v.count}
          />
        ))}
        {NOTIFICATION_REASON_KEYS.map((reason) => (
          <MobilePill
            key={reason}
            to={inboxHref(filters, { view: 'inbox', reason, postId: null })}
            active={filters.reason === reason}
            label={REASON_UI[reason].label}
            count={summary.reasons[reason]}
          />
        ))}
      </nav>
      {summary.posts.length > 0 && (
        <select
          aria-label="Filtrer par publication"
          className="input mt-3 py-2 text-sm lg:hidden"
          value={filters.postId ?? ''}
          onChange={(e) =>
            navigate(inboxHref(filters, { postId: e.target.value || null, reason: null }), {
              preventScrollReset: true,
            })
          }
        >
          <option value="">Toutes les publications</option>
          {summary.posts.map((p) => (
            <option key={p.postId} value={p.postId}>
              {p.postTitle} {p.unread ? `(${p.unread})` : ''}
            </option>
          ))}
        </select>
      )}

      {/* Bureau : barre latérale */}
      <aside className="hidden lg:block" aria-label="Vues et filtres des notifications">
        <div className="sticky top-24">
          <ul className="space-y-0.5">
            {views.map((v) => (
              <SideLink
                key={v.view}
                to={inboxHref(filters, { view: v.view, reason: null, postId: null })}
                active={isView(v.view)}
                icon={v.icon}
                label={v.label}
                count={v.count}
                strong={v.strong}
              />
            ))}
          </ul>

          <Heading>Filtres</Heading>
          <ul className="space-y-0.5">
            {NOTIFICATION_REASON_KEYS.map((reason) => {
              const { label, Icon } = REASON_UI[reason];
              return (
                <SideLink
                  key={reason}
                  to={inboxHref(filters, { view: 'inbox', reason, postId: null })}
                  active={filters.reason === reason}
                  icon={<Icon size={17} aria-hidden />}
                  label={label}
                  count={summary.reasons[reason]}
                />
              );
            })}
          </ul>

          {summary.posts.length > 0 && (
            <>
              <Heading>Publications</Heading>
              <ul className="space-y-0.5">
                {summary.posts.map((p) => (
                  <SideLink
                    key={p.postId}
                    to={inboxHref(filters, { view: 'inbox', postId: p.postId, reason: null })}
                    active={filters.postId === p.postId}
                    icon={<FileText size={17} aria-hidden />}
                    label={p.postTitle}
                    count={p.unread}
                  />
                ))}
              </ul>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

function MobilePill({
  to,
  active,
  label,
  count,
}: {
  to: string;
  active: boolean;
  label: string;
  count?: number;
}) {
  return (
    <Link
      to={to}
      preventScrollReset
      aria-current={active ? 'page' : undefined}
      className={cn(
        'inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium transition',
        active
          ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900'
          : 'border border-stone-200 bg-white text-stone-600 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300',
      )}
    >
      {label}
      {count ? <span className="tabular-nums opacity-60">{count}</span> : null}
    </Link>
  );
}
