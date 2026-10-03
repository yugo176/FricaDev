# Déployer FricaDev sur un VPS Datacloud

Procédure complète, de l'achat du serveur à la mise en ligne. Durée : environ 1 h la première fois.

## 1. Commander le serveur

- **Produit** : Serveur Cloud Starter (1 vCPU, 2 Go RAM, 50 Go NVMe) au minimum ; Business (2 vCPU, 8 Go)
  conseillé si le budget le permet (la compilation Docker et PostgreSQL aiment la mémoire).
- **Système** : Ubuntu 24.04 LTS.
- **Code promo CADEV (−40 %)** : prépayer **au moins 2 mois** pour rester en ligne pendant les votes
  (jusqu'au 10/11, idéalement 15/11). Garder la facture : c'est la preuve de recevabilité (art. 6).
- **Nom de domaine** : acheté sur Datacloud ou ailleurs.

## 2. DNS

Créer trois enregistrements `A` vers l'adresse IP du VPS :

| Nom                     | Rôle                       |
| ----------------------- | -------------------------- |
| `fricadev.exemple`      | site                       |
| `api.fricadev.exemple`  | API                        |
| `auth.fricadev.exemple` | connexion (OpenID Connect) |

## 3. Préparer le serveur

```bash
ssh root@IP_DU_VPS
apt update && apt upgrade -y
# Utilisateur dédié et pare-feu
adduser fricadev && usermod -aG sudo fricadev
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable
# Docker (script officiel de Docker)
curl -fsSL https://get.docker.com | sh
usermod -aG docker fricadev
# 2 Go de swap : évite les arrêts brutaux pendant la compilation sur un petit serveur
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

## 4. Récupérer le code et configurer

```bash
su - fricadev
git clone <URL_DU_DEPOT> fricadev && cd fricadev
cp .env.example .env.prod
```

Générer les secrets sur ta machine (`npm run keys:generate`) et les copier dans `.env.prod`, puis :

```env
NODE_ENV=production
DOMAIN=fricadev.exemple
WEB_URL=https://fricadev.exemple
AUTH_ISSUER=https://auth.fricadev.exemple
API_CORS_ORIGINS=https://fricadev.exemple
API_AUDIENCE=https://api.fricadev.local
```

### Base de données : deux options

**A. PostgreSQL sur le VPS (recommandé : données au Sénégal, latence minimale)**

```env
POSTGRES_PASSWORD=<mot de passe long et aléatoire>
API_DATABASE_URL="postgresql://fricadev:<mot de passe>@postgres:5432/fricadev?schema=app"
API_DIRECT_DATABASE_URL="postgresql://fricadev:<mot de passe>@postgres:5432/fricadev?schema=app"
AUTH_DATABASE_URL="postgresql://fricadev:<mot de passe>@postgres:5432/fricadev?schema=identity"
AUTH_DIRECT_DATABASE_URL="postgresql://fricadev:<mot de passe>@postgres:5432/fricadev?schema=identity"
WORKER_DATABASE_URL="postgresql://fricadev:<mot de passe>@postgres:5432/fricadev"
```

Ajouter `--profile db` à toutes les commandes `docker compose` ci-dessous.

**B. Neon** : reprendre les URL du `.env` de développement (préférer une région proche, `eu-central-1`).

## 5. Lancer

```bash
C="docker compose -f infra/compose.prod.yml --env-file .env.prod --profile db"
$C build                                   # 5 à 15 min la première fois
$C up -d postgres                          # option A seulement
$C --profile tools run --rm migrate-auth   # tables du service d'identité
$C --profile tools run --rm migrate-api    # tables de l'API + communautés de départ
$C up -d
$C ps                                      # tous les services « running » / « healthy »
```

Caddy obtient automatiquement les certificats HTTPS au premier accès (les DNS doivent déjà pointer
vers le VPS).

Premier administrateur (après avoir créé son compte et son profil sur le site) :

```bash
$C exec api npm run set-role -- <pseudo> ADMIN
```

## 6. Vérifier

- `https://fricadev.exemple` affiche le fil
- `https://api.fricadev.exemple/v1/health` → `{"status":"ok"}`
- `https://auth.fricadev.exemple/.well-known/openid-configuration` → `issuer` en `https://auth…`
- Inscription, connexion, publication, réponse, notification : voir `docs/TESTS_A_VERIFIER.md`

## 7. Connexion GitHub (facultatif)

Dans GitHub → Settings → Developer settings → OAuth Apps : URL de callback
`https://auth.fricadev.exemple/interaction`. Mettre `GITHUB_CLIENT_ID` et `GITHUB_CLIENT_SECRET` dans
`.env.prod`, puis `$C up -d auth`.

## 8. Photos de profil

Par défaut, les photos sont stockées sur le disque du VPS, dans le volume Docker `uploads`, et
servies par l'API (`https://api.fricadev.exemple/uploads/...`). Pour utiliser le stockage objet
Datacloud (S3), ajouter dans `.env.prod` :

```env
STORAGE_DRIVER=s3
S3_ENDPOINT=<point d'accès S3 Datacloud>
S3_BUCKET=fricadev
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_PUBLIC_URL=<URL publique du bucket>
```

Le bucket doit autoriser la lecture publique des objets du dossier `avatars/`.

## 9. Sauvegardes (option A)

Sauvegarde quotidienne gardée 14 jours (`crontab -e` en tant que `fricadev`) :

```cron
0 3 * * * cd ~/fricadev && docker compose -f infra/compose.prod.yml --env-file .env.prod --profile db exec -T postgres pg_dump -U fricadev -Fc fricadev > ~/backups/fricadev-$(date +\%F).dump && find ~/backups -name '*.dump' -mtime +14 -delete
```

Sauvegarder aussi les photos : `docker run --rm -v fricadev_uploads:/u -v ~/backups:/b alpine tar czf /b/uploads-$(date +%F).tgz -C /u .`

Copier régulièrement `~/backups` hors du serveur (stockage objet Datacloud, autre machine).
Restauration : `pg_restore -U fricadev -d fricadev --clean <fichier.dump>`.

## 10. Mettre à jour

```bash
cd ~/fricadev && git pull
$C build
$C --profile tools run --rm migrate-auth && $C --profile tools run --rm migrate-api
$C up -d
```

## 11. Surveillance

- Journaux : `$C logs -f api` (JSON structuré, un événement par ligne).
- Disponibilité : un moniteur externe (Uptime Kuma sur une autre machine, ou un service de ping)
  sur la page d'accueil et `/v1/health`, avec alerte e-mail ou Telegram.
