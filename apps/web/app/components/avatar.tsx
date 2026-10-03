import { useState } from 'react';

const COLORS = [
  'bg-ocre-50 text-ocre-800',
  'bg-brand-50 text-brand-800',
  'bg-indigo-50 text-indigo-800',
  'bg-terre-50 text-terre-800',
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Photo de profil, ou initiales sur une couleur stable dérivée du pseudo si la personne n'a pas
 * de photo (ou si l'image ne se charge pas).
 */
export function Avatar({
  name,
  seed,
  src,
  size = 36,
}: {
  name: string;
  seed: string;
  src?: string | null;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const color = COLORS[[...seed].reduce((sum, c) => sum + c.charCodeAt(0), 0) % COLORS.length];

  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="shrink-0 rounded-full bg-stone-100 object-cover dark:bg-stone-800"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-medium ${color}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
