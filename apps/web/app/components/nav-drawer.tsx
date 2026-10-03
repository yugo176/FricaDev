import { useEffect, useRef } from 'react';
import { Form, Link, useFetcher, useLocation } from 'react-router';
import {
  Bell,
  Handshake,
  History,
  Home,
  LogIn,
  LogOut,
  PlusSquare,
  Rss,
  Search,
  Settings,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import type { CommunityDto } from '@fricadev/shared';
import { POST_TYPE_UI } from '~/lib/post-types';
import { Avatar } from './avatar';
import { LogoMark } from './brand';
import { CommunityIcon } from './community-card';
import type { HeaderProfile } from './site-header';
import { cn, IconButton, Skeleton } from './ui';

const MAX_COMMUNITIES = 6;

interface Item {
  to: string;
  label: string;
  Icon: typeof Home;
  badge?: number;
}

/** L'entrée correspondant à la page affichée, paramètres du fil compris (?type, ?scope). */
function useIsActive() {
  const { pathname, search } = useLocation();
  const params = new URLSearchParams(search);
  return (to: string) => {
    const url = new URL(to, 'http://x');
    if (url.pathname === '/') {
      if (pathname !== '/') return false;
      return (
        params.get('type') === url.searchParams.get('type') &&
        params.get('scope') === url.searchParams.get('scope')
      );
    }
    return pathname === url.pathname || pathname.startsWith(`${url.pathname}/`);
  };
}

function DrawerLink({ item, active }: { item: Item; active: boolean }) {
  const { to, label, Icon, badge } = item;
  return (
    <li>
      <Link
        to={to}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'relative flex h-10 items-center gap-3 rounded-xl px-3 text-[15px] transition',
          active
            ? 'bg-stone-100 font-semibold text-stone-900 dark:bg-stone-800 dark:text-white'
            : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800/70 dark:hover:text-white',
        )}
      >
        {active && (
          <span
            className="absolute -left-3 top-2 h-6 w-1 rounded-r-full bg-brand-600"
            aria-hidden
          />
        )}
        <Icon size={18} aria-hidden className={active ? 'text-brand-600' : 'text-stone-400'} />
        <span className="flex-1">{label}</span>
        {badge ? (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-terre-800 px-1.5 text-[11px] font-semibold text-white">
            {badge > 99 ? '99+' : badge}
          </span>
        ) : null}
      </Link>
    </li>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-stone-200 px-3 py-3 first:border-t-0 dark:border-stone-800">
      {title && (
        <p className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-wider text-stone-400">
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

function MyCommunities({ open }: { open: boolean }) {
  const fetcher = useFetcher<{ communities: CommunityDto[] }>({ key: 'my-communities' });
  // Chargées à l'ouverture seulement (la liste précédente reste affichée pendant le rechargement).
  useEffect(() => {
    if (open && fetcher.state === 'idle') fetcher.load('/api/my-communities');
  }, [open]);

  const communities = fetcher.data?.communities;
  if (!communities) {
    return (
      <ul className="space-y-1 px-3" aria-busy>
        {[0, 1, 2].map((i) => (
          <li key={i} className="flex h-10 items-center gap-3">
            <Skeleton className="h-6 w-6 rounded-lg" />
            <Skeleton className="h-3 w-32" />
          </li>
        ))}
      </ul>
    );
  }
  if (communities.length === 0) {
    return (
      <Link to="/c" className="block px-3 py-2 text-sm font-medium text-brand-600 hover:underline">
        Rejoindre une communauté
      </Link>
    );
  }
  return (
    <ul className="space-y-0.5">
      {communities.slice(0, MAX_COMMUNITIES).map((c) => (
        <li key={c.id}>
          <Link
            to={`/c/${c.slug}`}
            className="flex h-10 items-center gap-3 rounded-xl px-3 text-sm text-stone-600 transition hover:bg-stone-100 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800/70 dark:hover:text-white"
          >
            <CommunityIcon community={c} size={24} />
            <span className="truncate">{c.name}</span>
          </Link>
        </li>
      ))}
      {communities.length > MAX_COMMUNITIES && (
        <li>
          <Link to="/c" className="block px-3 py-2 text-sm text-stone-500 hover:text-brand-600">
            Voir toutes ({communities.length})
          </Link>
        </li>
      )}
    </ul>
  );
}

/** Menu latéral façon GitHub : toute la navigation du site, ouvert par le bouton ☰ de l'en-tête. */
export function NavDrawer({
  id,
  open,
  onClose,
  profile,
  isAuthenticated,
  unread,
}: {
  id: string;
  open: boolean;
  onClose: () => void;
  profile: HeaderProfile | null;
  isAuthenticated: boolean;
  unread: number;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const location = useLocation();
  const isActive = useIsActive();

  // <dialog> natif : focus piégé, Échap et retour du focus sur ☰ fournis par le navigateur.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // Focus sur le panneau lui-même : pas d'anneau sur « × » à l'ouverture, Tab mène au 1er lien.
      dialog.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    onClose();
  }, [location.pathname, location.search]);

  const canModerate = profile?.role === 'MODERATOR' || profile?.role === 'ADMIN';

  const feed: Item[] = [
    { to: '/', label: 'Accueil', Icon: Home },
    ...(profile ? [{ to: '/?scope=following', label: 'Abonnements', Icon: Rss }] : []),
    ...(['QUESTION', 'PROJECT', 'ARTICLE', 'CODE'] as const).map((type) => ({
      to: `/?type=${type}`,
      label: POST_TYPE_UI[type].plural,
      Icon: POST_TYPE_UI[type].Icon,
    })),
  ];
  const explore: Item[] = [
    { to: '/coequipiers', label: 'Coéquipiers', Icon: Handshake },
    { to: '/c', label: 'Communautés', Icon: Users },
    { to: '/search', label: 'Recherche', Icon: Search },
  ];
  const mine: Item[] = profile
    ? [
        { to: '/new', label: 'Publier', Icon: PlusSquare },
        { to: '/notifications', label: 'Notifications', Icon: Bell, badge: unread },
        { to: '/activite', label: 'Mon activité', Icon: History },
        { to: '/settings', label: 'Paramètres', Icon: Settings },
        ...(canModerate ? [{ to: '/moderation', label: 'Modération', Icon: ShieldCheck }] : []),
      ]
    : [];

  const list = (items: Item[]) => (
    <ul className="space-y-0.5">
      {items.map((item) => (
        <DrawerLink key={item.to} item={item} active={isActive(item.to)} />
      ))}
    </ul>
  );

  return (
    <dialog
      ref={ref}
      id={id}
      aria-label="Menu"
      tabIndex={-1}
      className="drawer bg-white outline-none text-stone-900 shadow-2xl dark:bg-stone-950 dark:text-stone-100"
      onClose={onClose}
      onClick={(event) => {
        // Clic sur le fond assombri, ou sur un lien : on referme.
        const target = event.target as HTMLElement;
        if (target === event.currentTarget || target.closest('a')) ref.current?.close();
      }}
    >
      <div className="flex h-full flex-col">
        <div className="flex h-16 shrink-0 items-center justify-between px-4">
          <LogoMark size={32} />
          <IconButton label="Fermer le menu" onClick={() => ref.current?.close()}>
            <X size={20} aria-hidden />
          </IconButton>
        </div>

        <nav
          aria-label="Menu principal"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          {profile && (
            <Section>
              <Link
                to={`/u/${profile.handle}`}
                className="flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-stone-100 dark:hover:bg-stone-800/70"
              >
                <Avatar
                  name={profile.displayName}
                  seed={profile.handle}
                  src={profile.avatarUrl}
                  size={40}
                />
                <span className="min-w-0">
                  <span className="block truncate font-semibold tracking-tight">
                    {profile.displayName}
                  </span>
                  <span className="block truncate text-sm text-stone-500">@{profile.handle}</span>
                </span>
              </Link>
            </Section>
          )}
          <Section>{list(feed)}</Section>
          <Section>{list(explore)}</Section>
          {mine.length > 0 && <Section>{list(mine)}</Section>}
          {profile && (
            <Section title="Mes communautés">
              <MyCommunities open={open} />
            </Section>
          )}
        </nav>

        <div
          className="shrink-0 border-t border-stone-200 p-3 dark:border-stone-800"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
        >
          {isAuthenticated ? (
            <Form method="post" action="/auth/logout">
              <button
                type="submit"
                className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-[15px] text-stone-600 transition hover:bg-stone-100 hover:text-terre-800 dark:text-stone-300 dark:hover:bg-stone-800/70"
              >
                <LogOut size={18} aria-hidden className="text-stone-400" />
                Se déconnecter
              </button>
            </Form>
          ) : (
            <Link to="/auth/login" className="btn-primary btn-md w-full">
              <LogIn size={16} aria-hidden /> Se connecter
            </Link>
          )}
        </div>
      </div>
    </dialog>
  );
}
