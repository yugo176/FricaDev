// Test de fumée de l'API avec deux comptes : question, réponse, réactions, vote, acceptation,
// réputation et règles d'autorisation.
// Usage : node --env-file=.env scripts/smoke-api.mjs   (avec `npm run dev` lancé)
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

function token(...args) {
  return execFileSync(process.execPath, ['scripts/dev-token.mjs', ...args], {
    encoding: 'utf8',
    env: process.env,
  }).trim();
}

function tokenOrRegister(email, password, name) {
  try {
    return token(email, password);
  } catch {
    return token(email, password, '--register', name);
  }
}

async function call(tok, method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${tok}`,
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.status === 204 ? null : await res.json();
  return { status: res.status, data };
}

const step = (label) => console.log(`✓ ${label}`);

const awa = token();
const koffi = tokenOrRegister(
  process.env.DEV_TEST2_EMAIL,
  process.env.DEV_TEST2_PASSWORD,
  'Koffi Agbo',
);
step('Deux comptes connectés');

const me = await call(koffi, 'GET', '/v1/users/me');
if (!me.data.profile) {
  const created = await call(koffi, 'PUT', '/v1/users/me', {
    handle: 'koffi',
    displayName: 'Koffi Agbo',
    countryCode: 'BJ',
    skills: ['node', 'postgres'],
  });
  assert.equal(created.status, 200, JSON.stringify(created.data));
}
step('Profil de Koffi prêt');

const repBefore = {
  awa: (await call(awa, 'GET', '/v1/users/awa')).data.reputation,
  koffi: (await call(awa, 'GET', '/v1/users/koffi')).data.reputation,
};

const question = await call(awa, 'POST', '/v1/posts', {
  type: 'QUESTION',
  title: 'Quel pooler choisir pour PostgreSQL derrière une API Node ?',
  body: 'J’hésite entre **PgBouncer** et le pool intégré.\n\n```ts\nconst pool = new Pool({ max: 10 });\n```',
  tags: ['postgres', 'node'],
});
assert.equal(question.status, 201, JSON.stringify(question.data));
const postId = question.data.id;
step('Awa publie une question');

assert.equal((await call(awa, 'PUT', `/v1/posts/${postId}/reactions/USEFUL`)).status, 403);
step('Awa ne peut pas réagir à sa propre question (403)');

const reacted = await call(koffi, 'PUT', `/v1/posts/${postId}/reactions/USEFUL`);
assert.equal(reacted.status, 200);
assert.deepEqual(reacted.data.viewer.reactions, ['USEFUL']);
assert.equal(
  (await call(koffi, 'PUT', `/v1/posts/${postId}/reactions/USEFUL`)).data.reactionCount,
  1,
);
step('Koffi juge la question utile (idempotent)');

const answer = await call(koffi, 'POST', `/v1/posts/${postId}/comments`, {
  body: 'PgBouncer en mode *transaction* si tu as plusieurs instances.',
});
assert.equal(answer.status, 201, JSON.stringify(answer.data));
step('Koffi répond');

assert.equal((await call(koffi, 'PUT', `/v1/comments/${answer.data.id}/useful`)).status, 403);
assert.equal((await call(koffi, 'POST', `/v1/comments/${answer.data.id}/accept`)).status, 403);
step('Koffi ne peut ni voter pour sa réponse ni l’accepter (403)');

assert.equal((await call(awa, 'PUT', `/v1/comments/${answer.data.id}/useful`)).status, 204);
assert.equal((await call(awa, 'POST', `/v1/comments/${answer.data.id}/accept`)).status, 204);
step('Awa juge la réponse utile et l’accepte');

const comments = (await call(awa, 'GET', `/v1/posts/${postId}/comments`)).data;
assert.equal(comments[0].isAccepted, true);
assert.equal(comments[0].usefulCount, 1);
assert.equal(comments[0].viewer.votedUseful, true);
const post = (await call(awa, 'GET', `/v1/posts/${postId}`)).data;
assert.equal(post.commentCount, 1);
assert.equal(post.hasAcceptedAnswer, true);
step('Compteurs et réponse acceptée cohérents');

const repAfter = {
  awa: (await call(awa, 'GET', '/v1/users/awa')).data.reputation,
  koffi: (await call(awa, 'GET', '/v1/users/koffi')).data.reputation,
};
assert.equal(repAfter.awa - repBefore.awa, 5, 'Awa : +5 (question utile)');
assert.equal(repAfter.koffi - repBefore.koffi, 20, 'Koffi : +5 (utile) +15 (acceptée)');
step(
  `Réputation : Awa +${repAfter.awa - repBefore.awa}, Koffi +${repAfter.koffi - repBefore.koffi}`,
);

const filtered = (await call(awa, 'GET', '/v1/posts?type=QUESTION&tag=postgres')).data;
assert.ok(filtered.items.some((p) => p.id === postId));
step('Filtres par type et par tag');

console.log(`\nTout est bon. Publication de test : http://localhost:5173/p/${postId}`);
