import { Card } from './card';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

/** État vide : une invitation à agir plutôt qu'un simple « rien ici ». */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Card padding="lg" className="flex flex-col items-center text-center">
      <span className="text-brand-600 dark:text-brand-400 [&>svg]:h-8 [&>svg]:w-8 [&>svg]:stroke-[1.5]">
        {icon}
      </span>
      <p className="mt-4 font-semibold tracking-tight">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-stone-500 dark:text-stone-400">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}
