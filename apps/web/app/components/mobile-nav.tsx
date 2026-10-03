import { NavLink } from 'react-router';
import { Handshake, Home, PlusSquare, User, Users } from 'lucide-react';

interface Props {
  profile: { handle: string } | null;
  isAuthenticated: boolean;
}

/** Barre de navigation en bas de l'écran sur mobile, à portée de pouce. */
export function MobileNav({ profile, isAuthenticated }: Props) {
  const items = [
    { to: '/', label: 'Accueil', Icon: Home, end: true },
    { to: '/coequipiers', label: 'Coéquipiers', Icon: Handshake },
    {
      to: isAuthenticated ? '/new' : '/auth/login?returnTo=/new',
      label: 'Publier',
      Icon: PlusSquare,
    },
    { to: '/c', label: 'Communautés', Icon: Users },
    {
      to: profile ? `/u/${profile.handle}` : '/auth/login',
      label: profile ? 'Profil' : 'Connexion',
      Icon: User,
    },
  ];

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/95 backdrop-blur md:hidden dark:border-stone-800 dark:bg-stone-950/95"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="grid grid-cols-5">
        {items.map(({ to, label, Icon, end }) => (
          <li key={label}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex h-16 flex-col items-center justify-center gap-0.5 text-[11px] ${
                  isActive ? 'text-brand-600' : 'text-stone-500'
                }`
              }
            >
              <Icon size={22} aria-hidden />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
