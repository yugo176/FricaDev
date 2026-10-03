# FricaDev

Le réseau social des développeurs africains : projets, questions, code et articles,
avec des communautés par pays et par technologie.

Projet présenté au concours CADEV (Systalink). Toutes les dépendances sont sous licence
permissive ; voir [LICENSES.md](LICENSES.md).

## Architecture

```
navigateur ──► web (React Router v7, rendu serveur) ──► api (Express, modules)
                 │  connexion OpenID Connect                │
                 ▼                                          ▼
              auth (fournisseur OIDC)            PostgreSQL : schéma « app »
                 │                               worker (pg-boss) : tâches de fond
                 ▼
              PostgreSQL : schéma « identity »
```

| Dossier           | Rôle                                                                                                      |
| ----------------- | --------------------------------------------------------------------------------------------------------- |
| `apps/web`        | Site React avec rendu côté serveur (SEO, rapide en 3G). Garde les tokens dans un cookie httpOnly.         |
| `apps/api`        | API REST `/v1`, monolithe modulaire : chaque dossier de `src/modules` pourra devenir un microservice.     |
| `apps/auth`       | Fournisseur OpenID Connect. Le site en est le premier client ; il servira « Se connecter avec FricaDev ». |
| `apps/worker`     | Tâches de fond sur PostgreSQL (outbox, notifications, réputation).                                        |
| `packages/shared` | Schémas Zod et types partagés entre le front et l'API.                                                    |
| `packages/logger` | Logs JSON (pino).                                                                                         |
| `infra/`          | Docker, Compose et Caddy pour le VPS.                                                                     |

Chaque service a sa propre base logique (schéma PostgreSQL) et son propre client Prisma :
aucune requête ne traverse les schémas, ce qui permettra de les séparer physiquement.

## Démarrer en local

Prérequis : Node 22 ou plus, un projet [Neon](https://neon.tech).

```bash
npm install
cp .env.example .env
npm run keys:generate   # copier les valeurs affichées dans .env
```

Renseigner les URL Neon dans `.env` (URL `-pooler` pour l'application, URL directe pour les
migrations), puis créer les tables :

```bash
npm run db:migrate -w @fricadev/auth -- --name init
npm run db:migrate -w @fricadev/api -- --name init
npm run dev
```

| Service  | URL                                                    |
| -------- | ------------------------------------------------------ |
| Site     | http://localhost:5173                                  |
| API      | http://localhost:4000/v1/health                        |
| Identité | http://localhost:4001/.well-known/openid-configuration |

## Commandes

| Commande                                          | Effet                                                                                                 |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `npm run dev`                                     | Lance tous les services en mode développement                                                         |
| `npm run build`                                   | Compile tout le monorepo                                                                              |
| `npm run typecheck` / `npm run lint` / `npm test` | Vérifications                                                                                         |
| `npm run licenses`                                | Bloque toute licence à réciprocité (GPL, LGPL, AGPL, SSPL…)                                           |
| `npm run keys:generate`                           | Génère clés de signature et secrets                                                                   |
| `node --env-file=.env scripts/seed-demo.mjs`      | Publie des contenus de démonstration avec les comptes de test                                         |
| `node --env-file=.env scripts/seed-team-demo.mjs` | Ajoute photos de profil, postes et candidature de démonstration                                       |
| `node scripts/download-flags.mjs`                 | Retélécharge les drapeaux (domaine public) si on ajoute un pays                                       |
| `node --env-file=.env scripts/dev-token.mjs`      | Affiche un access token du compte de test (`DEV_TEST_EMAIL` / `DEV_TEST_PASSWORD`) pour appeler l'API |

Une base Neon éloignée (par ex. `us-east-1`) ajoute plusieurs secondes par requête depuis
l'Afrique : préférer la région `eu-central-1` (Francfort) en dev. En production, PostgreSQL
tourne sur le VPS, à côté de l'API.

## Interface

Les pages sont construites avec la bibliothèque de composants de `apps/web/app/components/ui`
(boutons, champs, cartes, badges, en-têtes de page, états vides, onglets, squelettes). Les styles de
base vivent dans `app.css` (`.btn-*`, `.card`, `.input`) : ne pas les réécrire dans les pages.
Composants métier réutilisables : `PostCard`, `AuthorLine`, `TagList`, `PostForm`, `ProfileFields`,
`MarkdownEditor`, `InfiniteList` / `InfiniteFeed`, `CommunityCard`, `UserCard`, `ReportButton`,
`OpeningCard`, `TeamSection`, `AvatarUploader`, `Avatar`, `NavDrawer` (menu latéral), `CommunityPicker`, `JoinButton`,
`NotificationList`, `NotificationsSidebar`, `NotificationsToolbar` (`components/notifications`), `ActivityItem` (page « Mon activité »),
`PostReactions`, `PostCards`, `ShareButton`, `Flag` / `CountryLabel`, blocs de colonne de droite (`post-sidebar.tsx` : `SidebarBlock`,
`AboutCard`, `CommunitySideCard`, `SimilarPosts` ; `team-section.tsx` : `TeamCard`, `OpeningsCard`, `TeamManagePanel`),
badges `Chip`, `StageChip`, `LangDot`, `StatusMark`, `MetaItem` (`components/ui/chip.tsx`), formulaire de publication
(`PostForm`, `post-form-fields.tsx`, `TagInput`, `ComposerTips`, `QuickComposer`, brouillons `lib/draft.ts`).

## Documentation

- `docs/DEPLOIEMENT.md` : mise en ligne pas à pas sur le VPS Datacloud
- `docs/TESTS_A_VERIFIER.md` : liste des vérifications avant la soumission

## Déploiement sur le VPS

```bash
cp .env.example .env.prod      # valeurs de production, DOMAIN=fricadev.exemple
docker compose -f infra/compose.prod.yml --env-file .env.prod up -d --build
docker compose -f infra/compose.prod.yml --env-file .env.prod --profile tools run --rm migrate
```

Ajouter `--profile db` pour héberger PostgreSQL sur le VPS au lieu de Neon.
Caddy obtient automatiquement les certificats HTTPS pour `DOMAIN`, `api.DOMAIN` et `auth.DOMAIN`.

## Montée en charge prévue

- API et site sans état : plusieurs instances derrière Caddy.
- Identifiants UUIDv7 et pagination par curseur (jamais d'OFFSET).
- Compteurs dénormalisés et patron outbox : chaque écriture publie un événement traité par le worker.
- Fil d'actualité calculé à la lecture aujourd'hui, précalculé par le worker plus tard.
- Recherche plein texte PostgreSQL, remplaçable derrière une interface.
- Cache et limites de débit partagés via Valkey (licence BSD) quand ce sera nécessaire.

## Feuille de route

- Connexion avec GitHub (fournisseur amont dans `apps/auth`).
- Écran de consentement et enregistrement d'applications tierces : « Se connecter avec FricaDev ».
- Création de publications, réponses, réactions, communautés, recherche et notifications.
