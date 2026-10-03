import { Card } from './card';
import { cn } from './cn';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-stone-200/80 dark:bg-stone-800', className)}
      aria-hidden
    />
  );
}

/** Silhouette d'une carte de publication pendant le chargement du fil. */
export function PostCardSkeleton() {
  return (
    <Card aria-hidden>
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-2.5 w-20" />
        </div>
      </div>
      <Skeleton className="mt-4 h-4 w-3/4" />
      <Skeleton className="mt-2.5 h-3 w-full" />
      <Skeleton className="mt-1.5 h-3 w-5/6" />
    </Card>
  );
}
