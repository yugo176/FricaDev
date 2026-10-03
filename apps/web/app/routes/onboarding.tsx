import { Form, redirect, useNavigation } from 'react-router';
import type { Route } from './+types/onboarding';
import { LogoMark } from '~/components/brand';
import { ProfileFields } from '~/components/profile-fields';
import { Button, Card, FormError, PageContainer } from '~/components/ui';
import { requireUser } from '~/lib/api.server';
import { apiErrorToActionData, splitList } from '~/lib/forms.server';

export const meta = () => [{ title: 'Crée ton profil · FricaDev' }];

export async function loader({ request }: Route.LoaderArgs) {
  const api = await requireUser(request);
  if (api.profile) throw redirect('/');
  const name = api.user?.name ?? '';
  const suggestedHandle = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 30);
  return { name, suggestedHandle };
}

interface UserResponse {
  handle: string;
  displayName: string;
  countryCode: string | null;
  avatarUrl?: string | null;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
}

export async function action({ request }: Route.ActionArgs) {
  const api = await requireUser(request);
  const form = await request.formData();
  try {
    const user = await api.call<UserResponse>('/v1/users/me', {
      method: 'PUT',
      body: {
        handle: String(form.get('handle') ?? ''),
        displayName: String(form.get('displayName') ?? ''),
        countryCode: form.get('countryCode') || undefined,
        bio: String(form.get('bio') ?? '') || undefined,
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
    const returnTo = new URL(request.url).searchParams.get('returnTo') ?? '/';
    return redirect(returnTo.startsWith('/') ? returnTo : '/', { headers: await api.headers() });
  } catch (error) {
    return apiErrorToActionData(error, await api.headers());
  }
}

export default function Onboarding({ loaderData, actionData }: Route.ComponentProps) {
  const busy = useNavigation().state === 'submitting';
  const errors = actionData?.fieldErrors ?? {};

  return (
    <PageContainer size="md">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="inline-flex">
            <LogoMark size={48} />
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
            Bienvenue sur FricaDev
          </h1>
          <p className="mt-2 text-[15px] text-stone-500">
            Ton profil, c’est ta vitrine auprès des devs de tout le continent.
          </p>
        </div>

        <Form method="post" className="space-y-5">
          <Card padding="lg">
            <ProfileFields
              defaults={{ handle: loaderData.suggestedHandle, displayName: loaderData.name }}
              errors={errors}
            />
          </Card>
          {!Object.values(errors).some(Boolean) && <FormError>{actionData?.error}</FormError>}
          <Button size="lg" loading={busy} className="w-full">
            Créer mon profil
          </Button>
        </Form>
      </div>
    </PageContainer>
  );
}
