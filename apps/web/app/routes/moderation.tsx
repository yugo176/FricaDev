import { data, Link, redirect, useFetcher } from 'react-router';
import { CheckCircle2, EyeOff, Flag, ShieldCheck } from 'lucide-react';
import { REPORT_REASON_LABELS, type ReportQueueItemDto } from '@fricadev/shared';
import type { Route } from './+types/moderation';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  PageContainer,
  PageHeader,
  StatusMark,
} from '~/components/ui';
import { requireProfile } from '~/lib/api.server';
import { timeAgo } from '~/lib/countries';

export const meta = () => [
  { title: 'Modération · FricaDev' },
  { name: 'robots', content: 'noindex' },
];

export async function loader({ request }: Route.LoaderArgs) {
  const api = await requireProfile(request);
  const role = api.profile?.role;
  if (role !== 'MODERATOR' && role !== 'ADMIN') throw redirect('/');
  const queue = await api.call<ReportQueueItemDto[]>('/v1/moderation/queue');
  return data({ queue }, { headers: await api.headers() });
}

export async function action({ request }: Route.ActionArgs) {
  const api = await requireProfile(request);
  const form = await request.formData();
  await api.call(`/v1/moderation/targets/${form.get('targetType')}/${form.get('targetId')}`, {
    method: 'POST',
    body: { action: form.get('action') },
  });
  return data({ ok: true }, { headers: await api.headers() });
}

function QueueItem({ item }: { item: ReportQueueItemDto }) {
  const fetcher = useFetcher();
  if (fetcher.state !== 'idle' || fetcher.data) {
    return (
      <Card as="li" className="flex items-center gap-2 text-sm text-stone-500">
        <CheckCircle2 size={16} className="text-brand-600" aria-hidden /> Décision enregistrée.
      </Card>
    );
  }
  const decide = (action: 'hide' | 'dismiss', label: string, variant: 'danger' | 'secondary') => (
    <fetcher.Form method="post">
      <input type="hidden" name="targetType" value={item.targetType} />
      <input type="hidden" name="targetId" value={item.targetId} />
      <input type="hidden" name="action" value={action} />
      <Button variant={variant} size="md">
        {label}
      </Button>
    </fetcher.Form>
  );

  return (
    <Card as="li" padding="lg">
      <div className="flex flex-wrap items-center gap-2">
        <StatusMark tone="danger" icon={<Flag size={14} aria-hidden />}>
          {item.reportCount} signalement{item.reportCount > 1 ? 's' : ''}
        </StatusMark>
        <Chip>{item.targetType === 'POST' ? 'Publication' : 'Réponse'}</Chip>
        {item.hidden && (
          <StatusMark tone="muted" icon={<EyeOff size={14} aria-hidden />}>
            Masqué en attente
          </StatusMark>
        )}
        <span className="ml-auto text-[13px] text-stone-500">
          Signalé il y a {timeAgo(item.firstReportedAt)}
        </span>
      </div>

      {item.preview ? (
        <blockquote className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-950/50">
          {item.preview.title && <p className="font-semibold">{item.preview.title}</p>}
          <p className="mt-1 line-clamp-4 text-sm text-stone-600 dark:text-stone-400">
            {item.preview.excerpt}
          </p>
          <footer className="mt-2 text-xs text-stone-500">
            par{' '}
            <Link to={`/u/${item.preview.author.handle}`} className="font-medium underline">
              {item.preview.author.displayName}
            </Link>
            {!item.hidden && (
              <>
                {' · '}
                <Link to={`/p/${item.preview.postId}`} className="underline">
                  voir dans son contexte
                </Link>
              </>
            )}
          </footer>
        </blockquote>
      ) : (
        <p className="mt-4 text-sm text-stone-500">Contenu introuvable.</p>
      )}

      <dl className="mt-4 text-sm">
        <dt className="font-medium">Motifs</dt>
        <dd className="mt-1 flex flex-wrap gap-1.5">
          {item.reasons.map((r) => (
            <Chip
              key={r}
              icon={<span className="h-1.5 w-1.5 rounded-full bg-red-600" aria-hidden />}
            >
              {REPORT_REASON_LABELS[r as keyof typeof REPORT_REASON_LABELS] ?? r}
            </Chip>
          ))}
        </dd>
        {item.details.length > 0 && (
          <>
            <dt className="mt-3 font-medium">Précisions des membres</dt>
            <dd>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-stone-600 dark:text-stone-400">
                {item.details.map((detail, i) => (
                  <li key={i}>{detail}</li>
                ))}
              </ul>
            </dd>
          </>
        )}
      </dl>

      <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-stone-100 pt-4 dark:border-stone-800">
        {decide('dismiss', 'Rejeter les signalements', 'secondary')}
        {decide('hide', 'Masquer le contenu', 'danger')}
      </div>
    </Card>
  );
}

export default function Moderation({ loaderData }: Route.ComponentProps) {
  const { queue } = loaderData;
  return (
    <PageContainer>
      <PageHeader
        icon={<ShieldCheck size={26} aria-hidden />}
        title="Modération"
        description="Un contenu signalé par 3 membres est masqué automatiquement en attendant ta décision."
      />
      {queue.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck size={22} aria-hidden />}
          title="Aucun signalement en attente"
          description="La communauté se tient bien. Les nouveaux signalements apparaîtront ici."
        />
      ) : (
        <ul className="space-y-4">
          {queue.map((item) => (
            <QueueItem key={`${item.targetType}:${item.targetId}`} item={item} />
          ))}
        </ul>
      )}
    </PageContainer>
  );
}
