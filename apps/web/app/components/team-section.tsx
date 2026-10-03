import { useEffect, useState } from 'react';
import { Link, useFetcher, useSearchParams } from 'react-router';
import { Check, ChevronDown, Globe2, Handshake, MapPin, Plus, Settings2, X } from 'lucide-react';
import {
  COMMITMENT_LABELS,
  COMMITMENTS,
  SUGGESTED_ROLES,
  type ApplicationDto,
  type MiniUserDto,
  type OpeningDto,
  type ProjectMemberDto,
} from '@fricadev/shared';
import { Avatar } from './avatar';
import { CommitmentBadge, OpeningCard } from './opening-card';
import { TagList } from './post-card';
import {
  Badge,
  StatusMark,
  Button,
  ButtonLink,
  Card,
  Field,
  FormError,
  Input,
  Select,
  Spinner,
  Textarea,
} from './ui';
import { timeAgo } from '~/lib/countries';
import { CountryLabel, Flag } from './flag';

type ActionResult = { ok: boolean; intent?: string | null; error?: string | null } | undefined;

function NewOpeningForm({ onDone }: { onDone: () => void }) {
  const fetcher = useFetcher<ActionResult>();
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.ok) onDone();
  }, [fetcher.state, fetcher.data, onDone]);

  return (
    <Card padding="lg">
      <fetcher.Form method="post" className="space-y-4">
        <input type="hidden" name="intent" value="create-opening" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Rôle recherché" htmlFor="role">
            <Input
              id="role"
              name="role"
              list="role-suggestions"
              required
              minLength={2}
              maxLength={60}
              placeholder="Dev backend"
            />
            <datalist id="role-suggestions">
              {SUGGESTED_ROLES.map((role) => (
                <option key={role} value={role} />
              ))}
            </datalist>
          </Field>
          <Field label="Engagement" htmlFor="commitment">
            <Select id="commitment" name="commitment" defaultValue="VOLUNTEER">
              {COMMITMENTS.map((value) => (
                <option key={value} value={value}>
                  {COMMITMENT_LABELS[value]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Missions et profil recherché" htmlFor="opening-description">
          <Textarea
            id="opening-description"
            name="description"
            rows={4}
            required
            minLength={10}
            maxLength={2000}
            placeholder="Ce que la personne fera, le temps à y consacrer, ce que le projet apporte…"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Compétences"
            htmlFor="opening-skills"
            hint="Séparées par des virgules."
            optional
          >
            <Input id="opening-skills" name="skills" placeholder="nodejs, postgres" />
          </Field>
          <label className="flex items-center gap-2.5 self-end pb-2.5 text-sm">
            <input
              type="checkbox"
              name="remote"
              defaultChecked
              className="h-4 w-4 accent-brand-600"
            />
            Possible à distance
          </label>
        </div>
        <FormError>
          {fetcher.data?.intent === 'create-opening' ? fetcher.data.error : null}
        </FormError>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onDone}>
            Annuler
          </Button>
          <Button loading={fetcher.state !== 'idle'}>Publier le poste</Button>
        </div>
      </fetcher.Form>
    </Card>
  );
}

function ApplicationItem({ application }: { application: ApplicationDto }) {
  const fetcher = useFetcher<ActionResult>();
  const decided = fetcher.formData?.get('decision') as string | undefined;
  const status =
    decided === 'accept' ? 'ACCEPTED' : decided === 'decline' ? 'DECLINED' : application.status;
  const { applicant } = application;

  return (
    <li className="rounded-xl border border-stone-200 p-3.5 dark:border-stone-800">
      <div className="flex items-start gap-3">
        <Avatar
          name={applicant.displayName}
          seed={applicant.handle}
          src={applicant.avatarUrl}
          size={36}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 text-sm">
            <Link to={`/u/${applicant.handle}`} className="font-semibold hover:underline">
              {applicant.displayName}
            </Link>
            <span className="text-[13px] text-stone-500">
              {applicant.countryCode && (
                <>
                  <CountryLabel code={applicant.countryCode} height={10} />
                  {' · '}
                </>
              )}
              {applicant.reputation} pts · {timeAgo(application.createdAt)}
            </span>
          </div>
          <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-stone-700 dark:text-stone-300">
            {application.message}
          </p>
          {applicant.skills.length > 0 && (
            <div className="mt-2">
              <TagList tags={applicant.skills.slice(0, 6)} />
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        {status === 'PENDING' ? (
          <>
            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="decide" />
              <input type="hidden" name="applicationId" value={application.id} />
              <input type="hidden" name="decision" value="decline" />
              <Button variant="ghost" size="sm" icon={<X size={14} aria-hidden />}>
                Refuser
              </Button>
            </fetcher.Form>
            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="decide" />
              <input type="hidden" name="applicationId" value={application.id} />
              <input type="hidden" name="decision" value="accept" />
              <Button size="sm" icon={<Check size={14} aria-hidden />}>
                Accepter dans l’équipe
              </Button>
            </fetcher.Form>
          </>
        ) : status === 'ACCEPTED' ? (
          <StatusMark tone="success" icon={<Check size={14} aria-hidden />}>
            Acceptée
          </StatusMark>
        ) : (
          <StatusMark tone="muted" icon={<X size={14} aria-hidden />}>
            Refusée
          </StatusMark>
        )}
      </div>
    </li>
  );
}

function OwnerControls({ opening }: { opening: OpeningDto }) {
  const [open, setOpen] = useState(false);
  const loader = useFetcher<ApplicationDto[]>();
  const toggle = useFetcher();

  function showApplications() {
    setOpen((value) => !value);
    if (!loader.data && loader.state === 'idle')
      loader.load(`/api/openings/${opening.id}/applications`);
  }

  const closed = (toggle.formData?.get('status') ?? opening.status) === 'CLOSED';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={showApplications}
          aria-expanded={open}
          icon={
            <ChevronDown
              size={14}
              className={open ? 'rotate-180 transition' : 'transition'}
              aria-hidden
            />
          }
        >
          Candidatures ({opening.applicationCount})
        </Button>
        <toggle.Form method="post">
          <input type="hidden" name="intent" value="toggle-opening" />
          <input type="hidden" name="openingId" value={opening.id} />
          <input type="hidden" name="status" value={closed ? 'OPEN' : 'CLOSED'} />
          <Button variant="ghost" size="sm">
            {closed ? 'Rouvrir le poste' : 'Marquer comme pourvu'}
          </Button>
        </toggle.Form>
      </div>
      {open &&
        (loader.state !== 'idle' && !loader.data ? (
          <p className="flex items-center gap-2 text-sm text-stone-500">
            <Spinner /> Chargement des candidatures…
          </p>
        ) : loader.data && loader.data.length > 0 ? (
          <ul className="space-y-2.5">
            {loader.data.map((application) => (
              <ApplicationItem key={application.id} application={application} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-stone-500">Pas encore de candidature.</p>
        ))}
    </div>
  );
}

function ApplyControls({ opening }: { opening: OpeningDto }) {
  const [open, setOpen] = useState(false);
  const fetcher = useFetcher<ActionResult>();
  const application = opening.viewer?.application;

  if (application?.status === 'PENDING') {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-stone-600 dark:text-stone-400">
          Ta candidature a été envoyée. L’auteur du projet va te répondre.
        </span>
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="withdraw" />
          <input type="hidden" name="applicationId" value={application.id} />
          <Button variant="ghost" size="sm" loading={fetcher.state !== 'idle'}>
            Retirer ma candidature
          </Button>
        </fetcher.Form>
      </div>
    );
  }
  if (application?.status === 'ACCEPTED') {
    return (
      <p className="text-sm font-medium text-brand-600">
        Tu fais partie de l’équipe pour ce poste.
      </p>
    );
  }
  if (application?.status === 'DECLINED') {
    return (
      <p className="text-sm text-stone-500">Ta candidature n’a pas été retenue pour ce poste.</p>
    );
  }
  if (opening.status === 'CLOSED') return null;

  return open ? (
    <fetcher.Form method="post" className="space-y-3">
      <input type="hidden" name="intent" value="apply" />
      <input type="hidden" name="openingId" value={opening.id} />
      <Field
        label="Pourquoi toi ?"
        htmlFor={`apply-${opening.id}`}
        hint="Ton expérience, ce que tu veux apporter, ta disponibilité (20 caractères minimum)."
        error={fetcher.data?.intent === 'apply' ? (fetcher.data.error ?? undefined) : undefined}
      >
        <Textarea
          id={`apply-${opening.id}`}
          name="message"
          rows={4}
          required
          minLength={20}
          maxLength={2000}
        />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Annuler
        </Button>
        <Button size="sm" loading={fetcher.state !== 'idle'}>
          Envoyer ma candidature
        </Button>
      </div>
    </fetcher.Form>
  ) : (
    <div className="flex justify-end">
      <Button size="sm" icon={<Handshake size={14} aria-hidden />} onClick={() => setOpen(true)}>
        Candidater
      </Button>
    </div>
  );
}

/**
 * Gestion de l'équipe par le porteur du projet (colonne principale : les formulaires ont besoin
 * de largeur) : ouvrir un poste, traiter les candidatures, marquer un poste comme pourvu.
 */
export function TeamManagePanel({ openings }: { openings: OpeningDto[] }) {
  // Arrivée depuis « Je cherche des coéquipiers » à la publication : formulaire déjà ouvert.
  const [searchParams] = useSearchParams();
  const [adding, setAdding] = useState(() => searchParams.get('ouvrir-poste') === '1');
  const openCount = openings.filter((o) => o.status === 'OPEN').length;
  const pending = openings.reduce((n, o) => n + o.applicationCount, 0);

  return (
    <section id="equipe" className="scroll-mt-24" aria-labelledby="manage-title">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2
          id="manage-title"
          className="flex items-center gap-2 text-lg font-semibold tracking-tight"
        >
          <Settings2 size={19} className="text-brand-600" aria-hidden /> Gérer l’équipe
          {pending > 0 && (
            <Badge tone="ocre">
              {pending} candidature{pending > 1 ? 's' : ''}
            </Badge>
          )}
        </h2>
        {!adding && openCount < 5 && (
          <Button
            variant="secondary"
            size="sm"
            icon={<Plus size={14} aria-hidden />}
            onClick={() => setAdding(true)}
          >
            Ouvrir un poste
          </Button>
        )}
      </div>
      <div className="space-y-3">
        {adding && <NewOpeningForm onDone={() => setAdding(false)} />}
        {openings.map((opening) => (
          <OpeningCard key={opening.id} opening={opening} showProject={false}>
            <OwnerControls opening={opening} />
          </OpeningCard>
        ))}
        {openings.length === 0 && !adding && (
          <p className="rounded-xl border border-dashed border-stone-300 px-4 py-5 text-center text-sm text-stone-500 dark:border-stone-700">
            Tu cherches des coéquipiers ? Ouvre un poste : il apparaîtra sur la page Coéquipiers et
            dans la colonne de droite de ton projet.
          </p>
        )}
      </div>
    </section>
  );
}

/** Bloc de la colonne de droite : le créateur et les membres, empilés. */
export function TeamCard({ owner, members }: { owner: MiniUserDto; members: ProjectMemberDto[] }) {
  return (
    <ul className="space-y-1">
      {[{ user: owner, role: 'Créateur du projet' }, ...members].map(({ user, role }) => (
        <li key={user.handle}>
          <Link
            to={`/u/${user.handle}`}
            className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-stone-100 dark:hover:bg-stone-800/70"
          >
            <Avatar name={user.displayName} seed={user.handle} src={user.avatarUrl} size={34} />
            <span className="min-w-0 flex-1 leading-tight">
              <span className="flex items-center gap-1.5 truncate text-sm font-semibold">
                {user.displayName}
                <Flag code={user.countryCode} height={10} />
              </span>
              <span className="block truncate text-xs text-stone-500">{role}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Bloc de la colonne de droite : postes ouverts, avec candidature sur place. */
export function OpeningsCard({
  postId,
  openings,
  isOwner,
  canInteract,
}: {
  postId: string;
  openings: OpeningDto[];
  isOwner: boolean;
  canInteract: boolean;
}) {
  const open = openings.filter((o) => o.status === 'OPEN');
  if (open.length === 0) {
    return (
      <p className="text-sm text-stone-500">
        {isOwner ? (
          <>
            Aucun poste ouvert.{' '}
            <a href="#equipe" className="font-medium text-brand-600 hover:underline">
              Ouvrir un poste
            </a>
          </>
        ) : (
          'L’équipe ne recrute pas pour le moment.'
        )}
      </p>
    );
  }
  return (
    <ul className="divide-y divide-stone-100 dark:divide-stone-800">
      {open.map((opening) => (
        <li key={opening.id} className="py-3 first:pt-0 last:pb-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold leading-snug tracking-tight">{opening.role}</p>
            <CommitmentBadge commitment={opening.commitment} />
          </div>
          <p className="mt-1 line-clamp-3 text-[13px] leading-relaxed text-stone-600 dark:text-stone-400">
            {opening.description}
          </p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
            <span className="inline-flex items-center gap-1">
              {opening.remote ? <Globe2 size={13} aria-hidden /> : <MapPin size={13} aria-hidden />}
              {opening.remote ? 'À distance' : 'Sur place'}
            </span>
            <span>
              {opening.applicationCount} candidature{opening.applicationCount > 1 ? 's' : ''}
            </span>
          </p>
          {opening.skills.length > 0 && (
            <div className="mt-2">
              <TagList tags={opening.skills} />
            </div>
          )}
          <div className="mt-3">
            {isOwner ? (
              <a href="#equipe" className="text-sm font-medium text-brand-600 hover:underline">
                Gérer les candidatures →
              </a>
            ) : canInteract ? (
              <ApplyControls opening={opening} />
            ) : (
              <ButtonLink
                to={`/auth/login?returnTo=/p/${postId}`}
                size="sm"
                variant="secondary"
                className="w-full"
              >
                Se connecter pour candidater
              </ButtonLink>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
