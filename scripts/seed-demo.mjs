// Publie quelques contenus de démonstration avec les comptes de test (pour les captures et la démo).
// Usage : node --env-file=.env scripts/seed-demo.mjs   (avec `npm run dev` lancé)
import { execFileSync } from 'node:child_process';

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';
const token = (...args) =>
  execFileSync(process.execPath, ['scripts/dev-token.mjs', ...args], {
    encoding: 'utf8',
    env: process.env,
  }).trim();

async function call(tok, method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { authorization: `Bearer ${tok}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

const awa = token();
const koffi = token(process.env.DEV_TEST2_EMAIL, process.env.DEV_TEST2_PASSWORD);
const communities = await call(awa, 'GET', '/v1/communities');
const community = (slug) => communities.find((c) => c.slug === slug)?.id;

await call(koffi, 'PUT', '/v1/communities/benin/membership');
await call(awa, 'PUT', '/v1/communities/senegal/membership');
await call(awa, 'PUT', '/v1/communities/paiement-mobile/membership');
await call(awa, 'PUT', '/v1/users/koffi/follow');

const project = await call(koffi, 'POST', '/v1/posts', {
  type: 'PROJECT',
  title: 'Zemi : livraison de repas pour les étudiants de Cotonou',
  body: `Je construis **Zemi**, une app de livraison pensée pour les campus.

- App mobile en Flutter, API Node.js + PostgreSQL
- Paiement mobile money via un agrégateur
- 120 utilisateurs en bêta à l’UAC

Je cherche **un ou une dev backend** pour la gestion des commandes en temps réel. Écris-moi !`,
  tags: ['flutter', 'nodejs', 'postgres'],
  communityId: community('benin'),
});

await call(awa, 'POST', '/v1/posts', {
  type: 'ARTICLE',
  title: 'Déployer une app Node.js sur un VPS africain en 20 minutes',
  body: `Retour d’expérience sur la mise en ligne de mon API sur un VPS à Dakar.

## Pourquoi un hébergement local ?

La latence : mes utilisateurs sont à Dakar et à Abidjan. Passer d’un serveur en Europe à un serveur au Sénégal a divisé le temps de réponse par trois.

## Les étapes

1. Docker et Docker Compose
2. Caddy pour le HTTPS automatique
3. Une sauvegarde PostgreSQL chaque nuit

\`\`\`bash
docker compose -f compose.prod.yml up -d --build
\`\`\``,
  tags: ['devops', 'docker', 'nodejs'],
  communityId: community('devops-cloud'),
});

await call(koffi, 'POST', '/v1/posts', {
  type: 'CODE',
  title: 'Formater un montant en FCFA proprement',
  body: `Le franc CFA n’a pas de centimes : on formate sans décimales.

\`\`\`ts
export const formatFcfa = (amount: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(amount);

formatFcfa(12500); // « 12 500 F CFA »
\`\`\``,
  tags: ['typescript', 'fcfa'],
});

await call(awa, 'PUT', `/v1/posts/${project.id}/reactions/LIKE`);
await call(awa, 'POST', `/v1/posts/${project.id}/comments`, {
  body: 'Super projet ! Pour le temps réel, regarde du côté de **Server-Sent Events** : plus simple que WebSocket pour suivre une commande.',
});
console.log('Contenus de démonstration publiés.');
