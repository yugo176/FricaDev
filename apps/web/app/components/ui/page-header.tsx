interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

/** En-tête de page : titre, sous-titre et actions, identique sur toutes les pages. */
export function PageHeader({ title, description, icon, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight sm:text-[28px]">
          {icon && <span className="text-brand-600">{icon}</span>}
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-prose text-[15px] text-stone-500 dark:text-stone-400">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  );
}

/** Conteneur de page : largeur et marges cohérentes. */
export function PageContainer({
  size = 'md',
  children,
}: {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}) {
  const width = { sm: 'max-w-lg', md: 'max-w-3xl', lg: 'max-w-5xl', xl: 'max-w-6xl' }[size];
  return (
    <main className={`mx-auto w-full ${width} animate-fade-up px-4 py-6 sm:py-10`}>{children}</main>
  );
}

export function SectionTitle({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 mt-10 flex items-center justify-between gap-2 first:mt-0">
      <h2 className="text-lg font-semibold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}
