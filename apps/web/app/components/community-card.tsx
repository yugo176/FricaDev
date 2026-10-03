import { Link } from 'react-router';
import { Users } from 'lucide-react';
import type { CommunityDto } from '@fricadev/shared';
import { techIcon } from '~/lib/community-ui';
import { Flag } from './flag';
import { JoinButton, useMembership } from './join-button';
import { Card, cn } from './ui';

/** Pays : le drapeau seul. Techno : l'icône dédiée, colorée, sans fond. */
export function CommunityIcon({
  community,
  size = 40,
}: {
  community: Pick<CommunityDto, 'type' | 'slug' | 'countryCode'>;
  size?: number;
}) {
  const Icon = techIcon(community.slug);
  return (
    <span
      className="flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {community.type === 'COUNTRY' ? (
        <Flag
          code={community.countryCode}
          height={Math.round(size * 0.62)}
          className={size <= 28 ? 'rounded-[2px]' : 'rounded-[4px]'}
        />
      ) : (
        <Icon
          size={Math.round(size * 0.62)}
          strokeWidth={1.75}
          className="text-brand-600 dark:text-brand-400"
        />
      )}
    </span>
  );
}

function MemberCount({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-stone-500">
      <Users size={13} aria-hidden /> {count} membre{count > 1 ? 's' : ''}
    </span>
  );
}

/** Carte de communauté : toute la carte mène à la communauté, le bouton permet de la rejoindre sur place. */
export function CommunityCard({
  community,
  hasProfile,
  compact = false,
}: {
  community: CommunityDto;
  hasProfile: boolean;
  compact?: boolean;
}) {
  const { isMember, memberCount } = useMembership(community);
  return (
    <Card
      interactive
      padding={compact ? 'sm' : 'md'}
      className={cn(
        'relative flex gap-3.5',
        compact ? 'items-center' : 'flex-col',
        isMember && 'ring-1 ring-brand-600/25',
      )}
    >
      <div className={cn('flex min-w-0 flex-1 gap-3.5', compact ? 'items-center' : 'items-start')}>
        <CommunityIcon community={community} size={compact ? 36 : 44} />
        <div className="min-w-0 flex-1">
          <Link
            to={`/c/${community.slug}`}
            className="block truncate font-semibold tracking-tight after:absolute after:inset-0 after:rounded-2xl hover:text-brand-600"
          >
            {community.name}
          </Link>
          {compact ? (
            <MemberCount count={memberCount} />
          ) : (
            community.description && (
              <p className="mt-0.5 line-clamp-2 text-sm text-stone-500">{community.description}</p>
            )
          )}
        </div>
      </div>
      {compact ? (
        <JoinButton community={community} hasProfile={hasProfile} size="sm" className="relative" />
      ) : (
        <div className="flex items-center justify-between gap-3">
          <MemberCount count={memberCount} />
          <JoinButton
            community={community}
            hasProfile={hasProfile}
            size="sm"
            className="relative"
          />
        </div>
      )}
    </Card>
  );
}
