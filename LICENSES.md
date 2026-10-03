# Licences des composants

Le règlement CADEV (art. 6) n'admet que des composants sous licence permissive.
`npm run licenses` vérifie chaque dépendance, directe ou indirecte, et échoue en cas de
licence à réciprocité ; la CI l'exécute à chaque commit et produit un inventaire (SBOM).

Dernier contrôle : 568 paquets, aucune licence interdite.

| Licence                                                | Paquets |
| ------------------------------------------------------ | ------- |
| MIT                                                    | 474     |
| ISC                                                    | 40      |
| Apache-2.0                                             | 28      |
| BSD-2-Clause / BSD-3-Clause                            | 14      |
| BlueOak-1.0.0                                          | 5       |
| Autres permissives (Python-2.0, CC-BY, CC0, Unlicense) | 7       |

## Choix faits pour rester conforme

| Évité                   | Raison                                               | Remplacé par                                    |
| ----------------------- | ---------------------------------------------------- | ----------------------------------------------- |
| Tailwind CSS 4, Vite 8  | dépendent de lightningcss (MPL-2.0, copyleft faible) | Tailwind CSS 3.4, Vite 7                        |
| Redis ≥ 7.4             | licences RSAL / SSPL / AGPL                          | pg-boss sur PostgreSQL ; Valkey (BSD) plus tard |
| sharp / libvips         | LGPL                                                 | redimensionnement des images côté client        |
| MinIO, Grafana          | AGPL                                                 | stockage objet Datacloud, Uptime Kuma           |
| MySQL / MongoDB managés | GPL / SSPL                                           | PostgreSQL (licence PostgreSQL)                 |
| Images Docker Debian    | glibc (LGPL)                                         | images Alpine (musl, MIT)                       |

## Ressources externes

| Ressource                                   | Licence / conditions                                                                                                                          | Usage                                                                 |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Drapeaux des pays (`apps/web/public/flags`) | Domaine public, téléchargés une fois depuis le Flag CDN gratuit de [REST Countries](https://restcountries.com) (`scripts/download-flags.mjs`) | Servis par FricaDev : aucun appel extérieur à l'affichage, aucune clé |

L'API REST Countries elle-même (avec clé) n'est pas utilisée : ses conditions interdisent de stocker
les données plus de 3 jours et réservent l'offre gratuite aux projets non commerciaux.

## Composants principaux

React, React Router, Vite, Express, Zod, pino, Turborepo, lucide-react (MIT / ISC) ;
Prisma, oidc-provider, TypeScript (Apache-2.0 / MIT) ; PostgreSQL (licence PostgreSQL).
