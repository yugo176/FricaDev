// Génère les secrets de développement à copier dans .env.
// Usage : npm run keys:generate
import { randomBytes } from 'node:crypto';
import { exportJWK, generateKeyPair } from 'jose';

const { privateKey } = await generateKeyPair('RS256', { extractable: true });
const jwk = { ...(await exportJWK(privateKey)), alg: 'RS256', use: 'sig', kid: `k-${Date.now()}` };
const secret = () => randomBytes(32).toString('base64url');

console.log(`AUTH_JWKS='${JSON.stringify({ keys: [jwk] })}'`);
console.log(`AUTH_COOKIE_KEYS=${secret()},${secret()}`);
console.log(`WEB_CLIENT_SECRET=${secret()}`);
console.log(`WEB_SESSION_SECRET=${secret()}`);
