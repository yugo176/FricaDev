import { useEffect, useRef, useState } from 'react';
import { Form, Link, NavLink, useFetcher, useLocation } from 'react-router';
import { Bell, Menu, Plus, Search } from 'lucide-react';
import { Avatar } from './avatar';
import { Logo } from './brand';
import { NavDrawer } from './nav-drawer';
import { ButtonLink, cn, IconButton } from './ui';

export interface HeaderProfile {
  handle: string;
  displayName: string;
  avatarUrl?: string | null;
  role?: 'USER' | 'MODERATOR' | 'ADMIN';
}

/** Compteur de notifications non lues : chargé après l'affichage, rafraîchi à chaque navigation. */
export function useUnreadCount(enabled: boolean) {
  const fetcher = useFetcher<{ count: number }>();
  const location = useLocation();
  // Dernière valeur connue : la pastille ne clignote pas pendant le rechargement du compteur.
  const last = useRef(0);
  useEffect(() => {
    if (enabled) fetcher.load('/api/notifications-count');
    // Recharger quand on change de page suffit : pas de requête en boucle.
  }, [location.pathname, enabled]);
  if (fetcher.data) last.current = fetcher.data.count;
  return enabled ? last.current : 0;
}

function HeaderIcon({
  to,
  label,
  children,
  desktopOnly = true,
  mobileOnly = false,
}: {
  to: string;
  label: string;
  children: React.ReactNode;
  desktopOnly?: boolean;
  mobileOnly?: boolean;
}) {
  return (
    <NavLink
      to={to}
      aria-label={label}
      title={label}
      className={({ isActive }) =>
        cn(
          'relative h-10 w-10 items-center justify-center rounded-xl transition',
          mobileOnly ? 'flex md:hidden' : desktopOnly ? 'hidden md:flex' : 'flex',
          isActive
            ? 'text-brand-600 hover:bg-stone-100 dark:text-brand-400 dark:hover:bg-stone-800'
            : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900 dark:hover:bg-stone-800 dark:hover:text-white',
        )
      }
    >
      {children}
    </NavLink>
  );
}

export function SiteHeader({
  profile,
  isAuthenticated,
  unread,
}: {
  profile: HeaderProfile | null;
  isAuthenticated: boolean;
  unread: number;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="sticky top-0 z-20 border-b border-stone-200/80 bg-stone-50/80 backdrop-blur-md dark:border-stone-800/80 dark:bg-stone-950/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:gap-3">
        <IconButton
          label="Ouvrir le menu"
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          aria-controls="nav-drawer"
          onClick={() => setMenuOpen(true)}
          className="-ml-2 shrink-0 rounded-xl border border-stone-200 bg-white text-stone-600 shadow-card hover:text-stone-900 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:text-white"
        >
          <Menu size={20} aria-hidden />
        </IconButton>
        <Logo />
        <NavDrawer
          id="nav-drawer"
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          profile={profile}
          isAuthenticated={isAuthenticated}
          unread={unread}
        />

        <Form
          method="get"
          action="/search"
          className="mx-auto hidden w-full max-w-md md:block"
          role="search"
        >
          <label className="group flex h-10 items-center gap-2 rounded-xl border border-stone-200 bg-white px-3.5 text-sm shadow-card transition focus-within:border-brand-600 focus-within:ring-4 focus-within:ring-brand-600/10 dark:border-stone-800 dark:bg-stone-900">
            <Search
              size={16}
              className="text-stone-400 group-focus-within:text-brand-600"
              aria-hidden
            />
            <input
              name="q"
              minLength={2}
              className="w-full bg-transparent outline-none placeholder:text-stone-400 focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder="Chercher une question, un dev, un tag…"
              aria-label="Rechercher"
            />
          </label>
        </Form>
        <div className="flex-1 md:hidden" />

        <nav className="flex items-center gap-1" aria-label="Raccourcis">
          <HeaderIcon to="/search" label="Rechercher" mobileOnly>
            <Search size={20} aria-hidden />
          </HeaderIcon>
          {isAuthenticated && profile && (
            <HeaderIcon
              desktopOnly={false}
              to="/notifications"
              label={unread ? `Notifications (${unread} non lues)` : 'Notifications'}
            >
              <Bell size={20} aria-hidden />
              {unread > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-terre-800 px-1 text-[10px] font-semibold text-white ring-2 ring-stone-50 dark:ring-stone-950">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </HeaderIcon>
          )}
        </nav>

        {isAuthenticated ? (
          <div className="hidden items-center gap-3 md:flex">
            <ButtonLink to="/new" icon={<Plus size={16} aria-hidden />}>
              Publier
            </ButtonLink>
            {profile && (
              <Link
                to={`/u/${profile.handle}`}
                aria-label="Mon profil"
                className="rounded-full ring-2 ring-transparent transition hover:ring-brand-600/30"
              >
                <Avatar
                  name={profile.displayName}
                  seed={profile.handle}
                  src={profile.avatarUrl}
                  size={36}
                />
              </Link>
            )}
          </div>
        ) : (
          <ButtonLink to="/auth/login">Se connecter</ButtonLink>
        )}
      </div>
    </header>
  );
}
