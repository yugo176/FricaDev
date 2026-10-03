// Données de démonstration : photos de profil des comptes de test, postes et candidature
// sur le projet Zemi. Usage : node --env-file=.env scripts/seed-team-demo.mjs (avec `npm run dev`)
import { execFileSync } from 'node:child_process';
import { deflateSync } from 'node:zlib';

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';
const token = (...args) =>
  execFileSync(process.execPath, ['scripts/dev-token.mjs', ...args], {
    encoding: 'utf8',
    env: process.env,
  }).trim();

async function call(tok, method, path, body, raw) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${tok}`,
      'content-type': raw ? 'image/png' : 'application/json',
    },
    body: raw ?? (body ? JSON.stringify(body) : undefined),
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

/** PNG 256 × 256 en dégradé (aucune dépendance), pour illustrer les photos de profil. */
function gradientPng([r1, g1, b1], [r2, g2, b2]) {
  const size = 256;
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3);
    for (let x = 0; x < size; x++) {
      const t = (x + y) / (2 * size);
      row[1 + x * 3] = r1 + (r2 - r1) * t;
      row[2 + x * 3] = g1 + (g2 - g1) * t;
      row[3 + x * 3] = b1 + (b2 - b1) * t;
    }
    rows.push(row);
  }
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, sum]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const awa = token();
const koffi = token(process.env.DEV_TEST2_EMAIL, process.env.DEV_TEST2_PASSWORD);

await call(awa, 'PUT', '/v1/users/me/avatar', null, gradientPng([15, 110, 86], [239, 159, 39]));
await call(koffi, 'PUT', '/v1/users/me/avatar', null, gradientPng([60, 52, 137], [216, 90, 48]));
console.log('Photos de profil envoyées.');

const projects = await call(koffi, 'GET', '/v1/posts?type=PROJECT&author=koffi&limit=1');
const project = projects.items[0];
if (!project) throw new Error('Projet de démonstration introuvable : lancer seed-demo.mjs avant');

const existing = await call(koffi, 'GET', `/v1/posts/${project.id}/openings`);
if (existing.length === 0) {
  const backend = await call(koffi, 'POST', `/v1/posts/${project.id}/openings`, {
    role: 'Dev backend',
    description:
      'Concevoir le suivi des commandes en temps réel (SSE) et l’intégration du paiement mobile money. Environ 6 h par semaine.',
    skills: ['nodejs', 'postgres'],
    commitment: 'PARTNER',
    remote: true,
  });
  await call(koffi, 'POST', `/v1/posts/${project.id}/openings`, {
    role: 'Designer UI/UX',
    description:
      'Repenser le parcours de commande pour des téléphones d’entrée de gamme : écrans simples, peu de données.',
    skills: ['figma', 'ux'],
    commitment: 'VOLUNTEER',
    remote: true,
  });
  const application = await call(awa, 'POST', `/v1/openings/${backend.id}/applications`, {
    message:
      'J’ai intégré Wave et Orange Money sur deux projets à Dakar, et je connais bien Node.js et PostgreSQL. Disponible le soir et le week-end.',
  });
  await call(koffi, 'POST', `/v1/applications/${application.id}/decision`, { decision: 'accept' });
  console.log('Postes créés, candidature d’Awa acceptée.');
} else {
  console.log('Postes déjà présents.');
}
