import type { Config } from '@react-router/dev/config';

/**
 * Hôte du site vu par le navigateur. Derrière Caddy, la connexion jusqu'au
 * conteneur est en HTTP : sans cette liste, React Router refuse les formulaires
 * (origine https://… différente de l'URL interne http://…).
 */
function allowedActionOrigins(): string[] | undefined {
  const raw = process.env.WEB_URL;
  if (!raw) return undefined;
  try {
    const host = new URL(raw).host;
    return host ? [host] : undefined;
  } catch {
    return undefined;
  }
}

// Rendu côté serveur : pages publiques indexables par les moteurs de recherche
// et premier affichage rapide sur mobile en 3G.
export default {
  ssr: true,
  allowedActionOrigins: allowedActionOrigins(),
} satisfies Config;
