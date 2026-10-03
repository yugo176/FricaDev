import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from 'react-router';
import type { Route } from './+types/root';
import { MobileNav } from './components/mobile-nav';
import { NavProgress } from './components/nav-progress';
import { SiteHeader, useUnreadCount } from './components/site-header';
import { createApi } from './lib/api.server';
import { getTheme } from './lib/theme.server';
import './app.css';

export const links: Route.LinksFunction = () => [
  { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
  { rel: 'manifest', href: '/manifest.webmanifest' },
];

export async function loader({ request }: Route.LoaderArgs) {
  const api = await createApi(request);
  return {
    profile: api.profile,
    isAuthenticated: api.isAuthenticated(),
    theme: getTheme(request),
  };
}

/** Appliqué avant le premier affichage : pas de flash blanc en mode sombre. */
const THEME_SCRIPT = `(function(){try{var t=document.documentElement.dataset.theme;if(t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}})()`;

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useRouteLoaderData<typeof loader>('root');
  const theme = data?.theme ?? 'system';
  const profile = data?.profile ?? null;
  const unread = useUnreadCount(Boolean(profile));
  return (
    <html
      lang="fr"
      data-theme={theme}
      className={theme === 'dark' ? 'dark' : undefined}
      suppressHydrationWarning
    >
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0F6E56" />
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <Meta />
        <Links />
      </head>
      <body>
        <NavProgress />
        <SiteHeader
          profile={profile}
          isAuthenticated={data?.isAuthenticated ?? false}
          unread={unread}
        />
        {children}
        <MobileNav profile={profile} isAuthenticated={data?.isAuthenticated ?? false} />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  const message = notFound
    ? 'Cette page n’existe pas ou a été déplacée.'
    : isRouteErrorResponse(error)
      ? String(error.data)
      : 'Une erreur inattendue est survenue. Réessaie dans un instant.';
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-6xl font-bold tracking-tight text-brand-600/20">
        {notFound ? '404' : isRouteErrorResponse(error) ? error.status : '500'}
      </p>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        {notFound ? 'Page introuvable' : 'Oups, quelque chose a coincé'}
      </h1>
      <p className="mt-2 text-[15px] text-stone-500">{message}</p>
      <a href="/" className="btn-primary btn-md mt-8">
        Retour à l’accueil
      </a>
    </main>
  );
}
