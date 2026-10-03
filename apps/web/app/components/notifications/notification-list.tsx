import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useFetcher } from 'react-router';
import {
  Archive,
  ArchiveRestore,
  CheckCheck,
  Inbox,
  Mail,
  MailOpen,
  MoreHorizontal,
  Pin,
  PinOff,
} from 'lucide-react';
import { reasonOf, type NotificationAction, type NotificationDto } from '@fricadev/shared';
import { timeAgo } from '~/lib/countries';
import { Avatar } from '../avatar';
import { cn } from '../ui';
import { apiParams, type InboxFilters } from './filters';
import { dateGroup } from '~/lib/dates';
import { KIND, REASON_UI } from './notification-kinds';

type Patch = Partial<Pick<NotificationDto, 'readAt' | 'pinnedAt' | 'archivedAt'>>;

function patchFor(action: NotificationAction): Patch {
  const now = new Date().toISOString();
  return {
    read: { readAt: now },
    unread: { readAt: null },
    pin: { pinnedAt: now },
    unpin: { pinnedAt: null },
    archive: { archivedAt: now, readAt: now },
    unarchive: { archivedAt: null },
  }[action];
}

/** Une notification reste-t-elle dans la vue affichée après une action ? */
function belongs(n: NotificationDto, view: InboxFilters['view']) {
  if (view === 'inbox') return !n.archivedAt;
  if (view === 'pinned') return Boolean(n.pinnedAt);
  return Boolean(n.archivedAt);
}

function ActionButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 transition hover:bg-stone-200/70 hover:text-stone-900 dark:hover:bg-stone-700 dark:hover:text-white"
    >
      {children}
    </button>
  );
}

function rowActions(n: NotificationDto) {
  return [
    n.readAt
      ? { action: 'unread' as const, label: 'Marquer comme non lue', Icon: Mail }
      : { action: 'read' as const, label: 'Marquer comme lue', Icon: MailOpen },
    n.pinnedAt
      ? { action: 'unpin' as const, label: 'Désépingler', Icon: PinOff }
      : { action: 'pin' as const, label: 'Épingler (garder sous la main)', Icon: Pin },
    n.archivedAt
      ? { action: 'unarchive' as const, label: 'Remettre dans la boîte', Icon: ArchiveRestore }
      : { action: 'archive' as const, label: 'Archiver (sortir de la boîte)', Icon: Archive },
  ];
}

/** Menu « ⋯ » des actions sur mobile (pas de survol au doigt). */
function MobileMenu({
  notification,
  onAction,
}: {
  notification: NotificationDto;
  onAction: (action: NotificationAction) => void;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (ref.current?.open && !ref.current.contains(e.target as Node)) ref.current.open = false;
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);
  return (
    <details ref={ref} className="relative z-10 md:hidden">
      <summary
        aria-label="Actions"
        className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 [&::-webkit-details-marker]:hidden"
      >
        <MoreHorizontal size={18} aria-hidden />
      </summary>
      <div className="absolute right-0 top-9 z-20 w-60 rounded-xl border border-stone-200 bg-white p-1 shadow-lift dark:border-stone-700 dark:bg-stone-900">
        {rowActions(notification).map(({ action, label, Icon }) => (
          <button
            key={action}
            type="button"
            onClick={() => {
              if (ref.current) ref.current.open = false;
              onAction(action);
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <Icon size={16} className="text-stone-400" aria-hidden /> {label}
          </button>
        ))}
      </div>
    </details>
  );
}

function NotificationRow({
  notification: n,
  selected,
  onSelect,
  onAction,
}: {
  notification: NotificationDto;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onAction: (action: NotificationAction) => void;
}) {
  const { Icon, text, tone } = KIND[n.kind] ?? KIND.answer;
  const reason = reasonOf(n.kind);
  const ReasonIcon = reason ? REASON_UI[reason].Icon : Inbox;
  const actor = n.payload.actor;
  const unread = !n.readAt;
  const summary = [
    actor?.displayName ?? 'Quelqu’un',
    text,
    n.payload.role ? `(poste ${n.payload.role})` : '',
    n.payload.postTitle ? `« ${n.payload.postTitle} »` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <li
      className={cn(
        'group relative flex items-center gap-2.5 px-3 py-3 transition sm:gap-3 sm:px-4',
        selected
          ? 'bg-brand-50/70 dark:bg-brand-800/15'
          : 'hover:bg-stone-50 dark:hover:bg-stone-800/40',
      )}
    >
      <span
        className={cn('h-2 w-2 shrink-0 rounded-full', unread ? 'bg-brand-600' : 'bg-transparent')}
        aria-label={unread ? 'Non lue' : undefined}
      />
      <input
        type="checkbox"
        checked={selected}
        onChange={(e) => onSelect(e.target.checked)}
        aria-label={`Sélectionner : ${summary}`}
        className="relative z-10 h-4 w-4 shrink-0 cursor-pointer rounded accent-brand-600"
      />
      <span className="relative shrink-0">
        {actor ? (
          <Avatar name={actor.displayName} seed={actor.handle} src={actor.avatarUrl} size={36} />
        ) : (
          <span className="flex h-9 w-9 rounded-full bg-stone-100 dark:bg-stone-800" />
        )}
        <span
          className={cn(
            // Rond de la couleur de la carte (lisible sur la photo), icône colorée, sans teinte.
            'absolute -bottom-1 -right-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white ring-2 ring-white dark:bg-stone-900 dark:ring-stone-900',
            tone,
          )}
        >
          <Icon size={10} aria-hidden />
        </span>
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-xs text-stone-500">
          <ReasonIcon size={12} aria-hidden />
          {reason ? REASON_UI[reason].label : 'Activité'}
          {n.payload.role && <> · poste {n.payload.role}</>}
          <span className="md:hidden">· {timeAgo(n.createdAt)}</span>
        </p>
        <Link
          to={`/notifications/${n.id}/open`}
          className={cn(
            'line-clamp-2 text-[14.5px] leading-snug after:absolute after:inset-0',
            unread ? 'text-stone-900 dark:text-white' : 'text-stone-600 dark:text-stone-400',
          )}
        >
          <span className={unread ? 'font-semibold' : 'font-medium'}>
            {actor?.displayName ?? 'Quelqu’un'}
          </span>{' '}
          {text}
          {n.payload.postTitle && (
            <>
              {' '}
              <span className={unread ? 'font-medium' : ''}>« {n.payload.postTitle} »</span>
            </>
          )}
        </Link>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {n.pinnedAt && (
          <Pin size={14} className="fill-current text-ocre-600" aria-label="Épinglée" />
        )}
        <time
          dateTime={n.createdAt}
          className="hidden w-12 text-right text-xs tabular-nums text-stone-500 md:block md:group-focus-within:hidden md:group-hover:hidden"
        >
          {timeAgo(n.createdAt)}
        </time>
        <div className="relative z-10 hidden items-center md:group-focus-within:flex md:group-hover:flex">
          {rowActions(n).map(({ action, label, Icon: ActionIcon }) => (
            <ActionButton key={action} label={label} onClick={() => onAction(action)}>
              <ActionIcon size={16} aria-hidden />
            </ActionButton>
          ))}
        </div>
        <MobileMenu notification={n} onAction={onAction} />
      </div>
    </li>
  );
}

/**
 * Liste de la boîte de réception : regroupement, sélection multiple et actions affichées
 * immédiatement (le serveur confirme ensuite, sans recharger les pages déjà chargées).
 */
export function NotificationList({
  items,
  filters,
  empty,
}: {
  items: NotificationDto[];
  filters: InboxFilters;
  empty: React.ReactNode;
}) {
  const fetcher = useFetcher();
  const [patches, setPatches] = useState<Record<string, Patch>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const visible = useMemo(
    () => items.map((n) => ({ ...n, ...patches[n.id] })).filter((n) => belongs(n, filters.view)),
    [items, patches, filters.view],
  );

  // Nouveau filtre : on vide la sélection.
  const filterKey = JSON.stringify(apiParams(filters));
  useEffect(() => setSelected(new Set()), [filterKey]);

  function apply(ids: string[], action: NotificationAction) {
    if (ids.length === 0) return;
    const patch = patchFor(action);
    setPatches((current) => {
      const next = { ...current };
      for (const id of ids) next[id] = { ...next[id], ...patch };
      return next;
    });
    if (action === 'archive' || action === 'unarchive' || action === 'unpin')
      setSelected(new Set());
    fetcher.submit(
      { intent: 'bulk', action, ids: JSON.stringify(ids) },
      { method: 'post', action: '/notifications' },
    );
  }

  function markAllRead() {
    setPatches((current) => {
      const next = { ...current };
      const now = new Date().toISOString();
      for (const n of visible) next[n.id] = { ...next[n.id], readAt: n.readAt ?? now };
      return next;
    });
    fetcher.submit(
      {
        intent: 'read-all',
        ...Object.fromEntries(Object.entries(apiParams(filters)).filter(([, v]) => v)),
      },
      { method: 'post', action: '/notifications' },
    );
  }

  const groups = useMemo(() => {
    const map = new Map<string, NotificationDto[]>();
    for (const n of visible) {
      const key =
        filters.group === 'post'
          ? (n.payload.postTitle ?? (n.kind === 'follow' ? 'Abonnés' : 'Autres'))
          : dateGroup(n.createdAt);
      map.set(key, [...(map.get(key) ?? []), n]);
    }
    return [...map.entries()];
  }, [visible, filters.group]);

  if (visible.length === 0) return <>{empty}</>;

  const selectedVisible = visible.filter((n) => selected.has(n.id));
  const allSelected = selectedVisible.length === visible.length;
  const someSelected = selectedVisible.length > 0;
  const ids = selectedVisible.map((n) => n.id);
  const anyUnread = visible.some((n) => !n.readAt);

  const bulkActions: { action: NotificationAction; label: string; Icon: typeof Mail }[] = [
    { action: 'read', label: 'Lu', Icon: MailOpen },
    { action: 'unread', label: 'Non lu', Icon: Mail },
    selectedVisible.every((n) => n.pinnedAt)
      ? { action: 'unpin', label: 'Désépingler', Icon: PinOff }
      : { action: 'pin', label: 'Épingler', Icon: Pin },
    filters.view === 'archived'
      ? { action: 'unarchive', label: 'Remettre', Icon: ArchiveRestore }
      : { action: 'archive', label: 'Archiver', Icon: Archive },
  ];

  return (
    <div className="card overflow-clip">
      <div className="sticky top-16 z-[15] flex min-h-12 items-center gap-3 border-b border-stone-200 bg-white/95 px-3 py-2 backdrop-blur sm:px-4 dark:border-stone-800 dark:bg-stone-900/95">
        <span className="w-2 shrink-0" />
        <input
          type="checkbox"
          checked={allSelected}
          ref={(el) => {
            if (el) el.indeterminate = someSelected && !allSelected;
          }}
          onChange={(e) =>
            setSelected(e.target.checked ? new Set(visible.map((n) => n.id)) : new Set())
          }
          aria-label="Tout sélectionner"
          className="h-4 w-4 shrink-0 cursor-pointer rounded accent-brand-600"
        />
        {someSelected ? (
          <>
            <span className="text-sm font-semibold tabular-nums">
              {selectedVisible.length} sélectionnée{selectedVisible.length > 1 ? 's' : ''}
            </span>
            <div className="ml-auto flex flex-wrap items-center justify-end gap-1">
              {bulkActions.map(({ action, label, Icon }) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => apply(ids, action)}
                  className="btn-secondary btn-sm"
                >
                  <Icon size={14} aria-hidden />
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sr-only sm:hidden">{label}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <span className="hidden text-sm text-stone-500 sm:inline">Tout sélectionner</span>
            {anyUnread && (
              <button type="button" onClick={markAllRead} className="btn-ghost btn-sm ml-auto">
                <CheckCheck size={15} aria-hidden /> Tout marquer comme lu
              </button>
            )}
          </>
        )}
      </div>

      {groups.map(([label, list]) => (
        <section key={label} aria-label={label}>
          <h2 className="border-b border-stone-100 bg-stone-50/80 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:border-stone-800 dark:bg-stone-950/40">
            <span className="line-clamp-1">{label}</span>
          </h2>
          <ul className="divide-y divide-stone-100 dark:divide-stone-800">
            {list.map((n) => (
              <NotificationRow
                key={n.id}
                notification={n}
                selected={selected.has(n.id)}
                onSelect={(checked) =>
                  setSelected((current) => {
                    const next = new Set(current);
                    if (checked) next.add(n.id);
                    else next.delete(n.id);
                    return next;
                  })
                }
                onAction={(action) => apply([n.id], action)}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
