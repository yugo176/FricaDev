import { useEffect } from 'react';
import { data, Form, useFetcher, useNavigation, useRouteLoaderData } from 'react-router';
import { LogOut, Monitor, Moon, Settings as SettingsIcon, Sun } from 'lucide-react';
import type { Route } from './+types/settings';
import { AvatarUploader } from '~/components/avatar-uploader';
import { ProfileFields } from '~/components/profile-fields';
import {
  Button,
  Card,
  FormError,
  FormSuccess,
  PageContainer,
  PageHeader,
  SectionTitle,
  cn,
} from '~/components/ui';
import { ApiError, requireProfile, type Api } from '~/lib/api.server';
import { apiErrorToActionData, splitList, type FieldErrors } from '~/lib/forms.server';

export const meta = () => [{ title: 'Paramètres · FricaDev' }];

interface Me {
  profile: {
    handle: string;
    displayName: string;
    bio: string | null;
    countryCode: string | null;
    avatarUrl: string | null;
    skills: string[];
    role: 'USER' | 'MODERATOR' | 'ADMIN';
  };
}

export async function loader({ request }: Route.LoaderArgs) {
  const api = await requireProfile(request);
  const { profile } = await api.call<Me>('/v1/users/me');
  return data({ profile, email: api.user?.email ?? null }, { headers: await api.headers() });
}

/** Met à jour la photo gardée en session (affichée dans l'en-tête). */
function rememberAvatar(api: Api, avatarUrl: string | null) {
  const profile = api.session.get('profile');
  if (profile) api.session.set('profile', { ...profile, avatarUrl });
  api.markChanged();
}

export async function action({ request }: Route.ActionArgs) {
  const api = await requireProfile(request);
  const form = await request.formData();
  const intent = form.get('intent');

  if (intent === 'avatar' || intent === 'avatar-remove') {
    try {
      let avatarUrl: string | null = null;
      if (intent === 'avatar') {
        const file = form.get('avatar');
        if (!(file instanceof Blob) || file.size === 0)
          throw new ApiError(400, 'no_file', 'Aucune image reçue');
        ({ avatarUrl } = await api.call<{ avatarUrl: string }>('/v1/users/me/avatar', {
          method: 'PUT',
          raw: { data: file, contentType: file.type || 'image/webp' },
        }));
      } else {
        await api.call('/v1/users/me/avatar', { method: 'DELETE' });
      }
      rememberAvatar(api, avatarUrl);
      return data({ ok: true, avatarUrl, error: null }, { headers: await api.headers() });
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      return data(
        { ok: false, avatarUrl: undefined, error: error.message },
        { status: error.status, headers: await api.headers() },
      );
    }
  }

  try {
    const user = await api.call<Me['profile']>('/v1/users/me', {
      method: 'PUT',
      body: {
        handle: String(form.get('handle') ?? ''),
        displayName: String(form.get('displayName') ?? ''),
        countryCode: form.get('countryCode') || undefined,
        bio: String(form.get('bio') ?? ''),
        skills: splitList(form.get('skills')),
      },
    });
    api.session.set('profile', {
      handle: user.handle,
      displayName: user.displayName,
      countryCode: user.countryCode,
      avatarUrl: user.avatarUrl ?? null,
      role: user.role,
    });
    api.markChanged();
    return data(
      {
        ok: true as boolean,
        intent: null,
        error: null as string | null,
        fieldErrors: {} as FieldErrors,
      },
      { headers: await api.headers() },
    );
  } catch (error) {
    return apiErrorToActionData(error, await api.headers());
  }
}

const THEME_OPTIONS = [
  { value: 'system', label: 'Système', Icon: Monitor },
  { value: 'light', label: 'Clair', Icon: Sun },
  { value: 'dark', label: 'Sombre', Icon: Moon },
] as const;

function ThemePicker() {
  const root = useRouteLoaderData<{ theme: string }>('root');
  const fetcher = useFetcher<{ theme: string }>();
  const current = (fetcher.formData?.get('theme') as string | null) ?? root?.theme ?? 'system';

  // Application immédiate, sans recharger la page.
  useEffect(() => {
    const html = document.documentElement;
    html.dataset.theme = current;
    const dark =
      current === 'dark' ||
      (current === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    html.classList.toggle('dark', dark);
  }, [current]);

  return (
    <fetcher.Form method="post" action="/api/theme" className="grid grid-cols-3 gap-2.5">
      {THEME_OPTIONS.map(({ value, label, Icon }) => {
        const active = current === value;
        return (
          <button
            key={value}
            name="theme"
            value={value}
            aria-pressed={active}
            className={cn(
              'flex flex-col items-center gap-2 rounded-2xl border bg-white px-3 py-4 text-sm font-medium shadow-card transition dark:bg-stone-900',
              active
                ? 'border-brand-600 text-brand-600 ring-4 ring-brand-600/10'
                : 'border-stone-200 text-stone-600 hover:border-stone-300 dark:border-stone-800 dark:text-stone-300',
            )}
          >
            <Icon size={20} aria-hidden /> {label}
          </button>
        );
      })}
    </fetcher.Form>
  );
}

export default function Settings({ loaderData, actionData }: Route.ComponentProps) {
  const { profile, email } = loaderData;
  const busy = useNavigation().state === 'submitting';
  const errors = actionData && 'fieldErrors' in actionData ? actionData.fieldErrors : {};

  return (
    <PageContainer>
      <PageHeader
        icon={<SettingsIcon size={26} aria-hidden />}
        title="Paramètres"
        description="Ton profil public, l’apparence du site et ton compte."
      />

      <SectionTitle>Photo de profil</SectionTitle>
      <Card padding="lg">
        <AvatarUploader
          name={profile.displayName}
          handle={profile.handle}
          avatarUrl={profile.avatarUrl}
        />
      </Card>

      <SectionTitle>Profil public</SectionTitle>
      <Form method="post" className="space-y-4">
        <Card padding="lg">
          <ProfileFields defaults={profile} errors={errors} />
        </Card>
        {!Object.values(errors).some(Boolean) && <FormError>{actionData?.error}</FormError>}
        {actionData?.ok && <FormSuccess>Profil enregistré.</FormSuccess>}
        <div className="flex justify-end">
          <Button loading={busy}>Enregistrer</Button>
        </div>
      </Form>

      <SectionTitle>Apparence</SectionTitle>
      <ThemePicker />

      <SectionTitle>Compte</SectionTitle>
      <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 text-sm">
          <p className="font-medium">Adresse e-mail</p>
          <p className="truncate text-stone-500">{email ?? 'Non renseignée'}</p>
        </div>
        <Form method="post" action="/auth/logout">
          <Button variant="secondary" size="md" icon={<LogOut size={16} aria-hidden />}>
            Se déconnecter
          </Button>
        </Form>
      </Card>
    </PageContainer>
  );
}
