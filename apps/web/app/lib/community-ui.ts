import {
  Atom,
  Braces,
  Brain,
  Briefcase,
  Cloud,
  Code2,
  Server,
  ShieldCheck,
  Smartphone,
  Terminal,
  Wallet,
} from 'lucide-react';
import type { CommunityDto } from '@fricadev/shared';

/** Icône de chaque communauté technologique (slug créé par apps/api/prisma/seed.ts). */
const TECH_ICONS: Record<string, typeof Code2> = {
  javascript: Braces,
  react: Atom,
  'php-laravel': Server,
  python: Terminal,
  mobile: Smartphone,
  'ia-data': Brain,
  'devops-cloud': Cloud,
  'paiement-mobile': Wallet,
  securite: ShieldCheck,
  carriere: Briefcase,
};

export function techIcon(slug: string) {
  return TECH_ICONS[slug] ?? Code2;
}

/** Minuscules et sans accents : « senegal » trouve « Sénégal ». */
export function normalize(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function matchesCommunity(community: CommunityDto, query: string) {
  const q = normalize(query);
  if (!q) return true;
  return normalize(
    `${community.name} ${community.description ?? ''} ${community.countryCode ?? ''}`,
  ).includes(q);
}

/** Rejointes d'abord, puis les plus peuplées. */
export function sortCommunities(list: CommunityDto[]) {
  return [...list].sort(
    (a, b) =>
      Number(Boolean(b.viewer?.isMember)) - Number(Boolean(a.viewer?.isMember)) ||
      b.memberCount - a.memberCount ||
      a.name.localeCompare(b.name, 'fr'),
  );
}
