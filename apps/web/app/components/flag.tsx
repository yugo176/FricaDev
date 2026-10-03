import { COUNTRY_NAMES } from '~/lib/countries';
import { cn } from './ui';

/**
 * Drapeau d'un pays (SVG du domaine public servi par FricaDev, voir scripts/download-flags.mjs).
 * Décoratif par défaut : le nom du pays est presque toujours écrit à côté.
 */
export function Flag({
  code,
  height = 12,
  label = false,
  className,
}: {
  code: string | null | undefined;
  height?: number;
  /** Lu par les lecteurs d'écran quand le nom du pays n'est pas affiché à côté. */
  label?: boolean;
  className?: string;
}) {
  if (!code || !COUNTRY_NAMES[code]) return null;
  return (
    <img
      src={`/flags/${code}.svg`}
      alt={label ? COUNTRY_NAMES[code] : ''}
      title={COUNTRY_NAMES[code]}
      width={Math.round((height * 4) / 3)}
      height={height}
      loading="lazy"
      decoding="async"
      className={cn(
        'inline-block shrink-0 rounded-[2px] object-cover align-[-1px] shadow-[0_0_0_1px_rgb(0_0_0/0.08)] dark:shadow-[0_0_0_1px_rgb(255_255_255/0.12)]',
        className,
      )}
      style={{ width: Math.round((height * 4) / 3), height }}
    />
  );
}

/** « 🇸🇳 Sénégal » : drapeau et nom du pays. */
export function CountryLabel({
  code,
  height = 11,
}: {
  code: string | null | undefined;
  height?: number;
}) {
  if (!code || !COUNTRY_NAMES[code]) return null;
  return (
    <span className="inline-flex items-center gap-1.5">
      <Flag code={code} height={height} />
      {COUNTRY_NAMES[code]}
    </span>
  );
}
