import { useFetcher, useFetchers } from 'react-router';
import { Check, Plus } from 'lucide-react';
import type { CommunityDto } from '@fricadev/shared';
import { Button, ButtonLink, type ButtonSize } from './ui';

/** État d'adhésion affiché tout de suite, avant la réponse du serveur. */
export function useMembership(community: CommunityDto) {
  const fetcher = useFetcher({ key: `membership-${community.slug}` });
  const serverMember = community.viewer?.isMember ?? false;
  const isMember = fetcher.formData ? fetcher.formData.get('join') === '1' : serverMember;
  const memberCount = community.memberCount + Number(isMember) - Number(serverMember);
  return { fetcher, isMember, memberCount };
}

/** Adhésions en cours d'envoi (slug → rejoint ?), pour mettre à jour les compteurs sans attendre. */
export function usePendingMemberships() {
  const pending = new Map<string, boolean>();
  for (const f of useFetchers()) {
    if (f.key.startsWith('membership-') && f.formData) {
      pending.set(f.key.slice('membership-'.length), f.formData.get('join') === '1');
    }
  }
  return pending;
}

/** Rejoindre / quitter une communauté, depuis n'importe quelle page (action de /c/:slug). */
export function JoinButton({
  community,
  hasProfile,
  size = 'md',
  className,
}: {
  community: CommunityDto;
  hasProfile: boolean;
  size?: ButtonSize;
  className?: string;
}) {
  const { fetcher, isMember } = useMembership(community);
  const iconSize = size === 'sm' ? 14 : 16;
  if (!hasProfile) {
    return (
      <ButtonLink
        to={`/auth/login?returnTo=/c/${community.slug}`}
        size={size}
        variant="secondary"
        icon={<Plus size={iconSize} aria-hidden />}
        className={className}
      >
        Rejoindre
      </ButtonLink>
    );
  }
  return (
    <fetcher.Form method="post" action={`/c/${community.slug}`} className={className}>
      <input type="hidden" name="join" value={isMember ? '0' : '1'} />
      <Button
        size={size}
        variant={isMember ? 'secondary' : 'primary'}
        aria-pressed={isMember}
        aria-label={isMember ? `Quitter ${community.name}` : `Rejoindre ${community.name}`}
        title={isMember ? 'Cliquer pour quitter' : undefined}
        icon={
          isMember ? <Check size={iconSize} aria-hidden /> : <Plus size={iconSize} aria-hidden />
        }
        className="w-full"
      >
        {isMember ? 'Membre' : 'Rejoindre'}
      </Button>
    </fetcher.Form>
  );
}
