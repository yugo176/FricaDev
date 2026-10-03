import { PROJECT_STAGE_LABELS, PROJECT_STAGES, type ProjectStage } from '@fricadev/shared';
import { cn } from './cn';

/**
 * Pastille sobre : fond de la surface, bordure très fine, icône colorée sans fond.
 * La couleur reste dans le détail (l'icône) ; le texte garde la couleur du texte.
 */
export function Chip({
  icon,
  children,
  className,
  title,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[7px] border border-stone-200/90 bg-white px-2 text-xs font-medium text-stone-700',
        'shadow-[inset_0_1px_0_rgb(255_255_255),0_1px_1px_rgb(28_25_23/0.04)]',
        'dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-200 dark:shadow-none',
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/** Avancement d'un projet : « Bêta » et 4 segments, remplis jusqu'à l'étape atteinte. */
export function StageChip({ stage }: { stage: ProjectStage }) {
  const reached = PROJECT_STAGES.indexOf(stage);
  return (
    <Chip title={`Avancement : ${PROJECT_STAGE_LABELS[stage]}`}>
      {PROJECT_STAGE_LABELS[stage]}
      <span className="flex gap-[3px]" aria-hidden>
        {PROJECT_STAGES.map((s, i) => (
          <span
            key={s}
            className={cn(
              'h-1 w-2.5 rounded-full',
              i <= reached ? 'bg-brand-400' : 'bg-stone-200 dark:bg-stone-700',
            )}
          />
        ))}
      </span>
    </Chip>
  );
}

/** Langage : point de couleur et nom, sans cadre (comme sur GitHub). */
export function LangDot({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-stone-600 dark:text-stone-300">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      {label}
    </span>
  );
}

const STATUS_TONE = {
  success: 'text-brand-600 dark:text-brand-400',
  pending: 'text-ocre-600 dark:text-ocre-200',
  danger: 'text-red-700 dark:text-red-400',
  muted: 'text-stone-500 dark:text-stone-400',
} as const;

/** Statut sans fond : l'icône et le texte portent la couleur. */
export function StatusMark({
  tone,
  icon,
  children,
  className,
}: {
  tone: keyof typeof STATUS_TONE;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 text-xs font-medium',
        STATUS_TONE[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/** Information discrète : petite icône et texte gris (« 6 min de lecture »). */
export function MetaItem({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
      {icon}
      {children}
    </span>
  );
}
