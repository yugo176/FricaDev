import { Link } from 'react-router';
import { Award } from 'lucide-react';
import { Avatar } from './avatar';
import { Card } from './ui';
import { CountryLabel } from './flag';

export function UserCard({
  user,
}: {
  user: {
    handle: string;
    displayName: string;
    avatarUrl?: string | null;
    countryCode: string | null;
    reputation: number;
  };
}) {
  return (
    <Card interactive padding="sm" className="relative flex items-center gap-3">
      <Avatar name={user.displayName} seed={user.handle} src={user.avatarUrl} size={40} />
      <div className="min-w-0 text-sm">
        <Link
          to={`/u/${user.handle}`}
          className="block truncate font-semibold after:absolute after:inset-0 after:rounded-2xl hover:text-brand-600"
        >
          {user.displayName}
        </Link>
        <p className="truncate text-[13px] text-stone-500">
          @{user.handle}
          {user.countryCode && (
            <>
              {' · '}
              <CountryLabel code={user.countryCode} height={10} />
            </>
          )}
        </p>
      </div>
      <span className="ml-auto inline-flex items-center gap-1 text-[13px] font-semibold tabular-nums text-ocre-800 dark:text-ocre-50">
        <Award size={14} className="text-ocre-400" aria-hidden /> {user.reputation}
      </span>
    </Card>
  );
}
