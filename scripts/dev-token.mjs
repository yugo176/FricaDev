// Obtient un access token de développement en se connectant avec un compte de test.
// Usage : node --env-file=.env scripts/dev-token.mjs [email mot-de-passe] [--register "Nom"]
// Par défaut : DEV_TEST_EMAIL / DEV_TEST_PASSWORD du .env. --register crée le compte d'abord.
// Prérequis : `npm run dev` lancé.

const WEB = process.env.WEB_URL ?? 'http://localhost:5173';
const args = process.argv.slice(2);
const registerIndex = args.indexOf('--register');
const registerName = registerIndex >= 0 ? args.splice(registerIndex, 2)[1] : null;
const email = args[0] ?? process.env.DEV_TEST_EMAIL;
const password = args[1] ?? process.env.DEV_TEST_PASSWORD;
if (!email || !password) throw new Error('Identifiants de test manquants');

const jars = new Map(); // un pot de cookies par hôte

async function request(url, init = {}) {
  const { host } = new URL(url);
  const jar = jars.get(host) ?? new Map();
  jars.set(host, jar);
  const res = await fetch(url, {
    ...init,
    redirect: 'manual',
    headers: { ...init.headers, cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') },
  });
  for (const cookie of res.headers.getSetCookie()) {
    const [pair] = cookie.split(';');
    const index = pair.indexOf('=');
    jar.set(pair.slice(0, index), pair.slice(index + 1));
  }
  const location = res.headers.get('location');
  return { res, next: location ? new URL(location, url).toString() : null };
}

let { next } = await request(`${WEB}/auth/login`);
({ next } = await request(next));
({ next } = await request(registerName ? `${next}/register` : `${next}/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams(
    registerName ? { name: registerName, email, password } : { email, password },
  ),
}));
while (next && !next.startsWith(`${WEB}/auth/callback`)) ({ next } = await request(next));
if (!next) throw new Error('Connexion refusée : vérifie le compte de test');
await request(next);

const raw = decodeURIComponent(jars.get(new URL(WEB).host).get('__fricadev'));
const session = JSON.parse(
  decodeURIComponent(
    escape(Buffer.from(raw.slice(0, raw.lastIndexOf('.')), 'base64').toString('binary')),
  ),
);
console.log(session.accessToken);
