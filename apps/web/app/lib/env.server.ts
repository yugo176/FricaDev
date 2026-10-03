import { fileURLToPath } from 'node:url';

// En dev, on charge le .env de la racine du monorepo ; en production, l'environnement
// est fourni par Docker.
if (process.env.NODE_ENV !== 'production') {
  try {
    process.loadEnvFile(fileURLToPath(new URL('../../../../.env', import.meta.url)));
  } catch {
    // Pas de .env : on garde les valeurs par défaut.
  }
}

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Variable d'environnement manquante : ${name}`);
  return value;
}

export const env = {
  webUrl: required('WEB_URL', 'http://localhost:5173'),
  /** URL publique du service d'identité (redirections du navigateur). */
  authIssuer: required('AUTH_ISSUER', 'http://localhost:4001'),
  /** URL interne pour les appels serveur à serveur (différente dans Docker). */
  authInternalUrl: required(
    'AUTH_INTERNAL_URL',
    process.env.AUTH_ISSUER ?? 'http://localhost:4001',
  ),
  apiInternalUrl: required('API_INTERNAL_URL', 'http://localhost:4000'),
  apiAudience: required('API_AUDIENCE', 'https://api.fricadev.local'),
  clientId: required('WEB_CLIENT_ID', 'fricadev-web'),
  get clientSecret() {
    return required('WEB_CLIENT_SECRET');
  },
  get sessionSecret() {
    return required('WEB_SESSION_SECRET');
  },
  isProduction: process.env.NODE_ENV === 'production',
};
