import { Link } from 'react-router';
import {
  CircleCheck,
  CircleDashed,
  CircleX,
  Coins,
  Globe2,
  HandHeart,
  Handshake,
  MapPin,
  Users,
} from 'lucide-react';
import { COMMITMENT_LABELS, type Commitment, type OpeningDto } from '@fricadev/shared';
import { Avatar } from './avatar';
import { TagList } from './post-card';
import { Card, Chip, StatusMark } from './ui';
import { timeAgo } from '~/lib/countries';

const COMMITMENT_ICON: Record<Commitment, React.ReactNode> = {
  VOLUNTEER: <HandHeart size={13} className="text-terre-600 dark:text-terre-400" aria-hidden />,
  PAID: <Coins size={13} className="text-brand-600 dark:text-brand-400" aria-hidden />,
  PARTNER: <Handshake size={13} className="text-ocre-600 dark:text-ocre-200" aria-hidden />,
};

export function CommitmentBadge({ commitment }: { commitment: Commitment }) {
  return <Chip icon={COMMITMENT_ICON[commitment]}>{COMMITMENT_LABELS[commitment]}</Chip>;
}

export function ApplicationStatusBadge({ status }: { status: string }) {
  if (status === 'ACCEPTED')
    return (
      <StatusMark tone="success" icon={<CircleCheck size={14} aria-hidden />}>
        Candidature acceptée
      </StatusMark>
    );
  if (status === 'DECLINED')
    return (
      <StatusMark tone="muted" icon={<CircleX size={14} aria-hidden />}>
        Non retenue
      </StatusMark>
    );
  if (status === 'PENDING')
    return (
      <StatusMark tone="pending" icon={<CircleDashed size={14} aria-hidden />}>
        Candidature envoyée
      </StatusMark>
    );
  return null;
}

/**
 * Carte d'un poste recherché. `showProject` affiche le projet et son auteur (page Coéquipiers) ;
 * sur la page du projet, ce contexte est déjà visible.
 */
export function OpeningCard({
  opening,
  showProject = true,
  children,
}: {
  opening: OpeningDto;
  showProject?: boolean;
  children?: React.ReactNode;
}) {
  const closed = opening.status === 'CLOSED';
  return (
    <Card as="article" className={closed ? 'opacity-70' : ''}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[17px] font-semibold tracking-tight">{opening.role}</h3>
          {showProject && (
            <Link
              to={`/p/${opening.project.id}`}
              className="mt-0.5 block truncate text-sm font-medium text-brand-600 hover:underline"
            >
              {opening.project.title}
            </Link>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {closed ? (
            <StatusMark tone="muted" icon={<CircleCheck size={14} aria-hidden />}>
              Pourvu
            </StatusMark>
          ) : (
            <CommitmentBadge commitment={opening.commitment} />
          )}
          {opening.viewer?.application && (
            <ApplicationStatusBadge status={opening.viewer.application.status} />
          )}
        </div>
      </header>

      <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-stone-600 dark:text-stone-400">
        {opening.description}
      </p>

      {opening.skills.length > 0 && (
        <div className="mt-3">
          <TagList tags={opening.skills} />
        </div>
      )}

      <footer className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-stone-500">
        {showProject && (
          <Link
            to={`/u/${opening.project.owner.handle}`}
            className="inline-flex items-center gap-2 hover:underline"
          >
            <Avatar
              name={opening.project.owner.displayName}
              seed={opening.project.owner.handle}
              src={opening.project.owner.avatarUrl}
              size={22}
            />
            {opening.project.owner.displayName}
          </Link>
        )}
        <span className="inline-flex items-center gap-1">
          {opening.remote ? <Globe2 size={14} aria-hidden /> : <MapPin size={14} aria-hidden />}
          {opening.remote ? 'À distance' : 'Sur place'}
        </span>
        <span className="inline-flex items-center gap-1">
          <Users size={14} aria-hidden /> {opening.applicationCount} candidature
          {opening.applicationCount > 1 ? 's' : ''}
        </span>
        <span>{timeAgo(opening.createdAt)}</span>
      </footer>

      {children && (
        <div className="mt-4 border-t border-stone-100 pt-4 dark:border-stone-800">{children}</div>
      )}
    </Card>
  );
}
