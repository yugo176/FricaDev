import type { Config } from '@react-router/dev/config';

// Rendu côté serveur : pages publiques indexables par les moteurs de recherche
// et premier affichage rapide sur mobile en 3G.
export default {
  ssr: true,
} satisfies Config;
