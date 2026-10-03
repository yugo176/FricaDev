import { codePreview, excerpt, type PostSummaryDto } from '@fricadev/shared';

/** Contenu de démonstration affiché tant que l'API n'a pas encore de publications. */
const posts = [
  {
    id: 'demo-1',
    type: 'PROJECT',
    title: 'Zemi : livraison de repas pour les étudiants de Lomé',
    body: 'App Flutter + API Node, paiement T-Money. 120 utilisateurs en bêta. Je cherche un dev backend.',
    tags: ['flutter', 'nodejs'],
    author: {
      id: 'u1',
      handle: 'yaovi',
      displayName: 'Yaovi B.',
      countryCode: 'TG',
      avatarUrl: null,
    },
    reactionCount: 48,
    likeCount: 30,
    usefulCount: 18,
    commentCount: 12,
    createdAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
  },
  {
    id: 'demo-2',
    type: 'QUESTION',
    title: 'Mon webhook de paiement est appelé deux fois, comment éviter le double crédit ?',
    body: 'Le fournisseur renvoie parfois la même notification. Comment rendre mon traitement idempotent en PHP ?',
    tags: ['php', 'paiement-mobile'],
    author: { id: 'u2', handle: 'awa', displayName: 'Awa D.', countryCode: 'SN', avatarUrl: null },
    reactionCount: 23,
    likeCount: 9,
    usefulCount: 14,
    commentCount: 6,
    createdAt: new Date(Date.now() - 35 * 60_000).toISOString(),
  },
  {
    id: 'demo-3',
    type: 'CODE',
    title: 'Valider un numéro mobile marocain en une ligne',
    body: '```js\nconst isMaMobile = (n) => /^(\\+212|0)[67]\\d{8}$/.test(n);\n```',
    tags: ['javascript', 'regex'],
    author: {
      id: 'u3',
      handle: 'salma',
      displayName: 'Salma M.',
      countryCode: 'MA',
      avatarUrl: null,
    },
    reactionCount: 91,
    likeCount: 70,
    usefulCount: 21,
    commentCount: 4,
    createdAt: new Date(Date.now() - 26 * 3600_000).toISOString(),
  },
];

export const demoFeed: PostSummaryDto[] = posts.map(({ body, ...post }) => ({
  ...post,
  type: post.type as PostSummaryDto['type'],
  excerpt: excerpt(body),
  codePreview: codePreview(body),
  details: null,
}));
