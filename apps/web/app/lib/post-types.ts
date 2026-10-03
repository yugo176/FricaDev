import { Code2, HelpCircle, Newspaper, Rocket } from 'lucide-react';
import type { PostType } from '@fricadev/shared';

export const POST_TYPE_UI: Record<
  PostType,
  {
    label: string;
    plural: string;
    hint: string;
    /** Couleur de l'icône du type (sans fond) */
    iconClass: string;
    Icon: typeof Rocket;
    placeholder: string;
  }
> = {
  QUESTION: {
    label: 'Question',
    plural: 'Questions',
    hint: 'Tu bloques sur un problème',
    iconClass: 'text-terre-600 dark:text-terre-400',
    Icon: HelpCircle,
    placeholder:
      'Décris ton problème : ce que tu essaies de faire, ce que tu as déjà tenté, le message d’erreur…\n\n```js\n// ton code\n```',
  },
  PROJECT: {
    label: 'Projet',
    plural: 'Projets',
    hint: 'Montre ce que tu construis',
    iconClass: 'text-indigo-600 dark:text-indigo-400',
    Icon: Rocket,
    placeholder:
      'Présente ton projet : le problème qu’il résout, la stack, où il en est, et ce dont tu as besoin (coéquipiers, retours…).',
  },
  CODE: {
    label: 'Code',
    plural: 'Code',
    hint: 'Partage un extrait utile',
    iconClass: 'text-brand-600 dark:text-brand-400',
    Icon: Code2,
    placeholder: 'Explique en une phrase, puis colle ton code :\n\n```ts\n// ton extrait\n```',
  },
  ARTICLE: {
    label: 'Article',
    plural: 'Articles',
    hint: 'Raconte, explique, enseigne',
    iconClass: 'text-ocre-600 dark:text-ocre-200',
    Icon: Newspaper,
    placeholder: '## Introduction\n\nTon retour d’expérience, ton tutoriel, tes conseils…',
  },
};
