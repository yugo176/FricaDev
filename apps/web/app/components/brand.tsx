import { Link } from 'react-router';

/** Logo FricaDev : le même dessin que l'icône du site (public/favicon.svg). */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="14" fill="#0F6E56" />
      <path
        d="M18 18h12a14 14 0 0 1 0 28H18z"
        fill="none"
        stroke="#E1F5EE"
        strokeWidth="6"
        strokeLinejoin="round"
      />
      <circle cx="46" cy="46" r="5" fill="#EF9F27" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="FricaDev, accueil">
      <LogoMark />
      <span className="text-[17px] font-bold tracking-tight">
        Frica<span className="text-brand-600">Dev</span>
      </span>
    </Link>
  );
}
