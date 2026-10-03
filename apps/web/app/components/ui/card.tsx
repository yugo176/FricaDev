import { cn } from './cn';

type CardElement = 'div' | 'article' | 'section' | 'li' | 'aside';

interface CardProps extends React.HTMLAttributes<HTMLElement> {
  as?: CardElement;
  /** Effet de survol, pour les cartes cliquables. */
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const PADDING = { none: '', sm: 'p-3', md: 'p-4 sm:p-5', lg: 'p-5 sm:p-7' };

export function Card({
  as: Tag = 'div',
  interactive,
  padding = 'md',
  className,
  ...props
}: CardProps) {
  return (
    <Tag
      className={cn(interactive ? 'card-interactive' : 'card', PADDING[padding], className)}
      {...props}
    />
  );
}

/** Titre de section à l'intérieur d'une carte. */
export function CardTitle({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h3 className="text-sm font-semibold tracking-tight">{children}</h3>
      {action}
    </div>
  );
}
