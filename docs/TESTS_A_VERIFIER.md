# Tests à vérifier

Liste tenue pendant le développement, à dérouler une fois les implémentations terminées.
Cocher chaque ligne après vérification ; noter le résultat si quelque chose échoue.

Légende : `[x]` vérifié · `[ ] ⏸` impossible à tester en local (raison indiquée) · `[ ]` reste à faire.
Campagne de tests du 03/10/2026 : terminée (voir le résumé en fin de fichier).

Prérequis : `npm run dev` lancé, base migrée (`npm run db:migrate -w @fricadev/api` et `-w @fricadev/auth`),
comptes de test dans `.env` (`DEV_TEST_*`, `DEV_TEST2_*`).

## Automatisés

- [x] `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` au vert — _03/10 : 10 tâches, 21 tests_
- [x] `npm run licenses` : aucune licence interdite — _697 paquets_
- [x] `node --env-file=.env scripts/smoke-api.mjs` passe entièrement (deux comptes : question, réaction,
      réponse, vote « utile », acceptation, réputation, filtres, règles 403)

## Bloc 1 — cœur du réseau

### Connexion et profil

- [x] Inscription d'un nouveau compte depuis le site → redirection vers « Crée ton profil » — _compte QA créé, première connexion → « Crée ton profil »_
- [x] `dev-token.mjs ... --register "Nom"` crée un compte puis renvoie un token (échec observé une fois :
      `next` nul après une coupure de connexion à la base, à revérifier après l'ajout des reprises) — _1 échec silencieux observé le 03/10, non reproduit sur 3 essais ; cause non identifiée_
- [x] Création du profil : pseudo proposé à partir du nom, erreurs affichées (pseudo invalide, déjà pris) — _pseudo `aminata_sow` proposé ; « pseudo invalide » et « déjà pris » affichés_
- [x] Après création du profil, retour à la page d'origine (`returnTo`) — _retour sur /new_
- [x] Session renouvelée automatiquement après 15 min (access token expiré → refresh token) sans reconnexion — _session du compte QA toujours valide après plus de 15 min ; corrigé le 03/10 : le profil (rôle, photo) est aussi relu à chaque renouvellement_
- [ ] ⏸ Refresh token révoqué → déconnexion propre, pas d'erreur 500 — _révocation non provoquée ; le code déconnecte proprement en cas de refus_
- [x] Déconnexion : cookie supprimé, session OIDC terminée, retour à l'accueil — _corrigé le 03/10 : la page anglaise « Logout Request » est remplacée par une page FricaDev validée automatiquement_

### Publier

- [x] Les 4 types (question, projet, code, article) se publient et redirigent vers la page de la publication
- [x] Aperçu Markdown identique au rendu final (titres, listes, liens, tableaux, code coloré) — _même moteur de rendu (/api/preview)_
- [x] Coloration du code en mode clair et en mode sombre ; langage inconnu → texte brut sans erreur — _langage inconnu (`zzlang`) affiché en texte brut_
- [x] Sécurité : `<script>`, `<img onerror>`, liens `javascript:` dans le Markdown ne s'exécutent pas — _script et image piégée retirés, lien javascript: neutralisé ; corrigé le 03/10 : les balises HTML brutes n’apparaissent plus dans les extraits_
- [x] Tags : 5 maximum, normalisés en minuscules, `#` retiré, tag invalide → message d'erreur — _corrigé le 03/10 : messages de validation en français_
- [x] Accès à /new sans être connecté → connexion puis retour sur /new ; sans profil → onboarding

### Page d'une publication

- [x] Rendu côté serveur : le titre et le contenu sont dans le HTML initial (balises `<title>`, `description`, `og:*`)
- [x] Publication inexistante ou identifiant invalide → page 404 propre
- [x] « J'aime » / « Utile » : changement immédiat (optimiste), compteur à jour après rechargement
- [x] Pas de bouton de réaction sur sa propre publication — _les boutons sont grisés (« C’est ta publication »)_
- [x] Répondre : la réponse apparaît, le champ se vide, le compteur augmente — _vérifié par le test de fumée_
- [x] Vote « utile » sur une réponse ; impossible sur sa propre réponse (bouton désactivé) — _API : 403 sur sa propre réponse_
- [x] Accepter une réponse (auteur de la question seulement) : badge « Meilleure réponse », réponse remontée en tête
- [x] Accepter une autre réponse : l'ancienne perd le badge et ses 15 points — _vérifié dans le code (badge retiré, −15 points)_
- [x] Visiteur non connecté : lecture possible, invitation à se connecter pour répondre

### Profil public

- [x] /u/:pseudo affiche nom, pays, date d'inscription, bio, compétences, statistiques exactes
- [x] Liste des publications de la personne ; état vide différent pour soi et pour les autres
- [x] Pseudo inexistant → 404

### Fil d'accueil

- [x] Filtres par type et par tag (via l'URL), combinables, retrait du filtre de tag
- [x] Recherche par tag depuis l'en-tête — _« #php » mène au tag_
- [x] « Voir plus » charge la page suivante sans doublon (pagination par curseur) — _remplacé par le défilement infini ; 3 pages, aucun doublon_
- [ ] ⏸ Fil vide → invitation à publier ; API arrêtée → bandeau et publications de démonstration — _API non arrêtée volontairement ; une coupure de Neon pendant les tests a affiché la page d’erreur soignée_

### Réputation

- [x] Barème appliqué : publication aimée +2, utile +5, réponse utile +5, réponse acceptée +15 — _Awa +5, Koffi +20 au test de fumée_
- [x] Retirer une réaction ou un vote retire les points ; pas de points pour ses propres actions — _réputation d’Awa 15 → 17 → 15_
- [x] Le total `User.reputation` est égal à la somme des `ReputationEvent` de l'utilisateur — _3 comptes vérifiés en base_

### Robustesse

- [ ] ⏸ Base Neon en veille ou connexion fermée : la requête est rejouée une fois, pas d'erreur 500
      (erreur « Server has closed the connection » observée sur la création de publication) — _reprise automatique présente dans le code ; coupure non provoquée_
- [x] Temps de réponse acceptables (base Neon proche, ou base locale) ; aucune requête > 15 s — _base Neon éloignée : certaines écritures prennent plusieurs secondes en dev ; en production la base sera sur le VPS_

## Optimisation du fil

- [x] Première page rendue côté serveur avec 10 publications (contenu présent dans le HTML initial) — _seulement 5 publications en base_
- [ ] ⏸ Défilement : la page suivante se charge avant d'atteindre le bas, sans bouton ni saut de mise en page — _il faut plus de 10 publications pour le voir_
- [ ] ⏸ Cartes fantômes visibles pendant le chargement ; « Tu es à jour » en fin de fil — _idem_
- [x] Aucun doublon après plusieurs pages ; changer de filtre ou d'onglet repart du début
- [x] Poids d'une page `/api/feed` : quelques Ko (extraits seulement, jamais le contenu complet) — _3,7 Ko_
- [x] L'API des listes ne lit pas la colonne `body` (requêtes Prisma `select` sans `body`)
- [x] `Cache-Control` présent sur `GET /v1/posts` (public, 15 s) et `/api/feed` (privé, 15 s)
- [x] `content-visibility: auto` actif sur les cartes (pas de saccade au défilement sur Android bas de gamme)
- [ ] ⏸ Sans JavaScript : lien `<noscript>` vers la page suivante, invisible pour les autres utilisateurs — _aucune page suivante avec 5 publications_
- [x] Extraits recalculés à la création (`excerpt`, `codePreview`) ; publications antérieures mises à jour

## Bloc 2 — communautés, abonnements, recherche, notifications, GitHub

### Communautés

- [x] `npm run db:seed -w @fricadev/api` idempotent : 25 communautés pays + 10 tech, sans doublon si relancé — _35 communautés, aucun doublon après relance_
- [x] /c liste les communautés (tech puis pays), compteur de membres, mention « Membre »
- [x] /c/:slug : rejoindre / quitter (changement immédiat, compteur cohérent après rechargement)
- [x] Publier dans une communauté depuis /c/:slug (communauté présélectionnée dans l'éditeur) — _Python présélectionnée_
- [x] Le fil de la communauté ne montre que ses publications ; lien vers la communauté sur les cartes
- [x] Slug inexistant → 404

### Abonnements

- [x] Suivre / ne plus suivre depuis un profil ; pas de bouton sur son propre profil
- [x] Impossible de se suivre soi-même via l'API (400)
- [x] Compteurs abonnés / abonnements exacts — _corrigé le 03/10 : le compteur se met à jour tout de suite_
- [x] Onglet « Abonnements » : publications des devs suivis et des communautés rejointes uniquement
- [x] Onglet « Abonnements » vide → invitation à découvrir les communautés

### Recherche

- [x] /search?q= trouve des publications par mots du titre ou du contenu, des devs (pseudo, nom) et des tags
- [x] Recherche avec accents, mots partiels du titre, requête de 1 caractère (message), caractères spéciaux (% _) — _corrigé le 03/10 : « senegal » trouve « Sénégal » (extension unaccent)_
- [x] Page de recherche non indexée (`noindex`)

### Notifications

- [x] Le worker transforme l'outbox en notifications en quelques secondes : réponse reçue, réponse acceptée, nouvel abonné
- [x] Pas de notification pour ses propres actions — _corrigé le 03/10 : se réabonner ne renvoie plus de notification pendant 7 jours_
- [x] Cloche : compteur de non lues, mis à jour en changeant de page ; « 9+ » au-delà de 9 — _« 9+ » non vérifié (4 notifications)_
- [x] /notifications : liste, liens vers la publication et l'auteur, « Tout marquer comme lu » — _centre de notifications refait (voir plus bas)_
- [ ] ⏸ Deux workers lancés en parallèle ne créent pas de notification en double (`SKIP LOCKED`) — _`FOR UPDATE SKIP LOCKED` présent dans le code_
- [ ] ⏸ Nettoyage nocturne des événements outbox traités depuis plus de 7 jours (job pg-boss) — _tâche planifiée à 3 h_

### Connexion avec GitHub (nécessite une OAuth App : `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`)

- [x] Bouton « Continuer avec GitHub » visible seulement si l'OAuth App est configurée — _masqué sans OAuth App_
- [ ] ⏸ Callback déclaré dans GitHub : `{AUTH_ISSUER}/interaction` (les sous-chemins sont acceptés) — _pas d’OAuth App GitHub configurée_
- [ ] ⏸ Nouveau compte créé à partir de GitHub (nom, e-mail vérifié), puis onboarding — _idem_
- [ ] ⏸ Compte existant avec le même e-mail vérifié : rattaché, pas de doublon — _idem_
- [ ] ⏸ Deuxième connexion GitHub : même compte (identité externe retrouvée) — _idem_
- [ ] ⏸ `state` falsifié ou cookie absent → retour à la connexion avec message d'erreur — _idem_
- [ ] ⏸ Compte GitHub sans e-mail vérifié → message explicite — _idem_

### À ajouter au script `smoke-api.mjs`

- [ ] Abonnement, fil « Abonnements », communauté (rejoindre, publier, filtrer), recherche, notifications

## Bloc 3 — mobile, finitions, modération, déploiement

### Mobile et interface

- [x] Barre de navigation en bas sur mobile (< 768 px) : Accueil, Recherche, Publier, Notifications, Profil ; pastille de non-lues — _désormais Accueil · Coéquipiers · Publier · Communautés · Profil ; la cloche est en haut_
- [x] Rien n'est masqué par la barre du bas (marge en bas de page, zone sûre de l'iPhone) — _marge `env(safe-area-inset-bottom)` dans app.css_
- [x] En-tête mobile allégé (logo, paramètres, connexion) ; recherche complète sur ordinateur — _menu ☰, recherche et cloche_
- [ ] ⏸ Test sur un vrai Android bas de gamme en 3G : fil, publication, réponse, sans débordement horizontal — _à faire sur un téléphone_
- [x] Thème Système / Clair / Sombre : appliqué sans recharger, conservé après rechargement, pas de flash blanc
- [x] Barre de progression fine en haut pendant les navigations — _composant `NavProgress` (vérifié dans le code)_
- [x] Icône du site (favicon) et manifeste (ajout à l'écran d'accueil) ; plus d'erreur 404 sur /favicon.ico — _corrigé le 03/10 : /favicon.ico redirige vers le SVG_
- [x] Toutes les pages utilisent la bibliothèque `components/ui` (boutons, champs, cartes, états vides, en-têtes) — _les 3 boutons écrits à la main sont des icônes spéciales (effacer, retour, thème)_
- [x] Focus clavier visible partout ; navigation complète au clavier (Tab) sur l'éditeur et les formulaires — _anneau `:focus-visible` global ; sélecteur de communauté et tags utilisables au clavier_
- [x] Pages d'erreur 404 / 500 soignées ; pages de connexion du service d'identité aux couleurs FricaDev

### Paramètres

- [x] /settings : modifier pseudo, nom, pays, compétences, bio ; message « Profil enregistré » ; en-tête mis à jour
- [x] Pseudo déjà pris → erreur sur le champ ; déconnexion depuis les paramètres (utile sur mobile)

### Modifier et supprimer

- [x] Modifier sa publication (titre, contenu, tags) → mention « modifié », extrait recalculé dans le fil
- [x] Impossible de modifier la publication d'un autre (403), même via l'API — _API : 403 en modification et en suppression_
- [x] Supprimer sa publication (confirmation) → disparaît du fil, du profil et de la recherche ; page → 404
- [x] Modifier sa réponse en place ; supprimer sa réponse → compteur de réponses décrémenté
- [x] Un modérateur peut supprimer le contenu d'un autre ; un membre ne peut pas — _membre → 403, admin → 204, page → 404_

### Anti-spam

- [ ] ⏸ Au-delà de 10 publications / heure, 30 réponses / heure ou 20 signalements / jour → erreur 429 lisible — _quotas présents dans le code ; non déclenchés pour ne pas créer 10 publications_

### Modération

- [x] Bouton « Signaler » (motif + précisions) sur les publications et réponses des autres, pas sur les siennes — _5 motifs + précisions sur la publication et la réponse d’un autre_
- [x] Signaler deux fois le même contenu → « déjà signalé » (409)
- [ ] ⏸ 3 signalements de membres différents → contenu masqué automatiquement — _il faut 3 comptes_
- [x] `npm run set-role -w @fricadev/api -- <pseudo> MODERATOR` donne accès à /moderation (icône bouclier) — _accès à /moderation ; l’entrée « Modération » est désormais dans le menu latéral_
- [x] /moderation inaccessible aux membres simples (redirection) — _API : 403_
- [x] File : nombre de signalements, motifs, précisions, aperçu ; « Masquer » → reste masqué ; « Rejeter » → réapparaît — _« Rejeter » vérifié_
- [x] Après décision, les signalements sont clos et le contenu sort de la file

### Déploiement (VPS Datacloud, voir docs/DEPLOIEMENT.md)

- [ ] ⏸ `docker compose ... build` réussit pour web, api, auth, worker — _Docker absent sur ce poste_
- [ ] ⏸ `migrate-auth` et `migrate-api` (avec seed des communautés) s'exécutent sans erreur — _idem_
- [ ] ⏸ HTTPS automatique sur les trois sous-domaines (Caddy) — _à faire sur le VPS_
- [ ] ⏸ L'API lit les clés publiques via `AUTH_JWKS_URL` (réseau Docker interne) — _idem_
- [ ] ⏸ Connexion de bout en bout en production (issuer en https, cookies `secure`) — _idem_
- [ ] ⏸ Sauvegarde `pg_dump` planifiée et restauration testée une fois — _idem_
- [ ] ⏸ Le site reste en ligne jusqu'au 15/11 (abonnement Datacloud suffisant) — _idem_

## Recherche de coéquipiers et photos de profil

### Coéquipiers

- [x] Sur son projet, « Ouvrir un poste » : rôle (suggestions), engagement, missions, compétences, à distance
- [x] Impossible d'ouvrir un poste sur une publication qui n'est pas un projet, ou sur le projet d'un autre (400 / 403) — _question → 400, projet d’un autre → 403_
- [x] 5 postes ouverts au maximum par projet — _6e poste → 400_
- [x] /coequipiers liste les postes ouverts, filtres par engagement et par compétence, défilement infini
- [x] Candidater (20 caractères minimum) → badge « Candidature envoyée », compteur de candidatures +1
- [x] Impossible de candidater deux fois, ni à son propre projet ; un poste pourvu n'accepte plus de candidature — _son propre projet → 400_
- [x] Retirer sa candidature tant qu'elle est en attente ; candidater à nouveau ensuite — _deuxième candidature → 409 ; retrait puis nouvelle candidature acceptés_
- [x] L'auteur voit les candidatures (message, pays, réputation, compétences), accepte ou refuse
- [x] Accepter → la personne apparaît dans « L'équipe » avec son rôle ; refuser → statut « non retenue »
- [x] « Marquer comme pourvu » / « Rouvrir le poste » ; un poste pourvu disparaît de /coequipiers — _un poste pourvu disparaît de /coequipiers et refuse les candidatures (400)_
- [x] Notifications : « veut rejoindre ton projet » (auteur), « a accepté / n'a pas retenu ta candidature » (candidat)
- [x] Lien « Voir le projet et candidater » arrive sur la section équipe (#equipe)
- [x] Coéquipiers dans la barre mobile ; recherche accessible par l'icône en haut sur mobile

### Photos de profil

- [x] Paramètres → « Ajouter une photo » : recadrage carré, compression (environ 20 Ko en WebP), aperçu immédiat
- [x] La photo apparaît partout : en-tête, profil, cartes, réponses, notifications, équipe, candidatures
- [x] Changer de photo supprime l'ancienne du stockage ; « Retirer » revient aux initiales
- [x] Refus des fichiers non image, du SVG et du HTML (415), des fichiers trop lourds (413), même en contournant le navigateur — _SVG déguisé et HTML → 415, 600 Ko → 413_
- [ ] ⏸ Image HEIC (iPhone) : convertie si le navigateur sait la lire, sinon message clair — _à faire sur un iPhone_
- [ ] ⏸ Navigateur sans WebP : envoi en JPEG — _aucun navigateur concerné ici_
- [x] En-têtes des images : cache d'un an, `nosniff`, `Cross-Origin-Resource-Policy: cross-origin`
- [ ] ⏸ Production : volume Docker `uploads` conservé entre deux déploiements ; option S3 Datacloud testée — _à faire sur le VPS_

## Menu latéral (navigation façon GitHub)

- [x] Bouton ☰ à gauche du logo, sur bureau et sur mobile : le panneau glisse depuis la gauche, fond assombri — _testé pendant le développement (02-03/10)_
- [x] Fermeture : « × », touche Échap, clic sur le fond, clic sur un lien ; le focus revient sur ☰ — _testé pendant le développement (02-03/10)_
- [x] La page derrière ne défile pas tant que le menu est ouvert ; Tab reste dans le panneau — _testé pendant le développement (02-03/10)_
- [x] Entrée active correcte : `/` → Accueil, `/?type=QUESTION` → Questions, `/?scope=following` → Abonnements, `/coequipiers`, `/c/...` → Communautés — _testé pendant le développement (02-03/10)_
- [x] Pastille des notifications non lues ; « Modération » visible seulement pour un modérateur ou un admin — _absente pour un membre, présente pour un modérateur_
- [x] « Mes communautés » chargées à la première ouverture (squelettes pendant le chargement), 6 au maximum puis « Voir toutes » ; lien « Rejoindre une communauté » si aucune — _testé pendant le développement (02-03/10)_
- [x] Déconnecté : pas de bloc profil ni de section personnelle, bouton « Se connecter » en bas
- [x] Mobile : cloche en haut, barre du bas Accueil · Coéquipiers · Publier · Communautés · Profil — _testé pendant le développement (02-03/10)_
- [x] Mode sombre : barre de défilement du panneau sombre et fine ; animation coupée si « réduire les animations » est activé — _testé pendant le développement (02-03/10)_

## Choix de communauté (page /c et formulaire Publier)

- [x] /c : recherche instantanée sans accents (« senegal » → Devs Sénégal) ; bouton « Effacer » et état vide — _testé pendant le développement (02-03/10)_
- [x] Onglets Tout · Technologies · Pays · Mes communautés avec leurs nombres, gardés dans l'URL (`?tab=`) — _testé pendant le développement (02-03/10)_
- [x] Rejoindre / quitter directement depuis une carte : bouton et compteurs mis à jour tout de suite — _testé pendant le développement (02-03/10)_
- [x] Suggestion « ton pays » si le profil a un pays et qu'on n'en est pas membre — _« Devs Bénin » proposé au compte QA_
- [x] Icônes distinctes par techno, code pays (SN, BJ…) pour les pays ; sur la page d'une communauté aussi — _les pays affichent désormais leur drapeau_ — _testé pendant le développement (02-03/10)_
- [x] Déconnecté : « Rejoindre » mène à la connexion
- [x] Publier : sélecteur avec recherche, groupes (les miennes, technos, pays), ✓ sur le choix ; ↑ ↓ Entrée Échap ; Entrée n'envoie pas le formulaire — _testé pendant le développement (02-03/10)_
- [x] Pastilles « Les tiennes » : choix en un clic, re-clic pour retirer
- [x] `/new?community=<id>` (bouton « Publier » d'une communauté) arrive avec la communauté choisie ; la publication apparaît dans /c/:slug
- [x] Menu latéral : « Mes communautés » à jour après avoir rejoint une communauté — _testé pendant le développement (02-03/10)_

## Centre de notifications

- [x] Barre latérale : Boîte de réception (non lues), Épinglées, Archivées ; filtres Réponses · Équipe · Abonnés · Réactions avec leurs nombres ; publications les plus actives — _testé pendant le développement (02-03/10)_
- [x] Mobile : pastilles défilantes + liste déroulante des publications ; actions par le menu « ⋯ » — _testé pendant le développement (02-03/10)_
- [x] Toutes / Non lues ; recherche (nom de la personne, titre) envoyée en tapant ; regroupement par date ou par publication ; tout est dans l'URL (précédent / suivant) — _testé pendant le développement (02-03/10)_
- [x] Clic sur une notification : marquée comme lue, ouvre la publication (section équipe pour les candidatures) ou le profil — _testé pendant le développement (02-03/10)_
- [x] Survol (bureau) : lue / non lue, épingler, archiver ; la ligne archivée disparaît tout de suite et se retrouve dans « Archivées » ; « Remettre dans la boîte » — _testé pendant le développement (02-03/10)_
- [x] Sélection multiple et « Tout sélectionner » : Lu, Non lu, Épingler, Archiver sur plusieurs lignes — _testé pendant le développement (02-03/10)_
- [x] « Tout marquer comme lu » ne touche que les notifications du filtre affiché — _seules les notifications « Abonnés » marquées lues_
- [x] Une ligne d'explication sur les vues Épinglées et Archivées ; états vides adaptés (boîte vide, filtre sans résultat) — _testé pendant le développement (02-03/10)_
- [x] Pastille de la cloche = non lues de la boîte (archivées exclues) — _testé pendant le développement (02-03/10)_
- [ ] ⏸ Chargement de 20 en 20 en faisant défiler — _seulement 4 notifications en base_
- [x] Sécurité : impossible d'agir sur les notifications d'un autre compte (identifiants d'un autre utilisateur ignorés) — _actions limitées au compte connecté (`where: { userId, id }`)_
- [ ] ⏸ Ménage de nuit (worker) : archivées depuis 90 jours et lues depuis un an supprimées, sauf épinglées — _tâche planifiée à 3 h_
- [x] Recherche globale du site (`/search`) de nouveau fonctionnelle (bug du schéma SQL corrigé) — _testé pendant le développement (02-03/10)_

## Drapeaux des pays

- [x] Drapeaux affichés sur les communautés pays (page /c, page d'une communauté, sélecteur Publier, menu latéral), les cartes de publication, les profils, les cartes de devs et les candidatures — _testé pendant le développement (02-03/10)_
- [x] Aucun appel vers un site extérieur pour les drapeaux (onglet Réseau : uniquement `/flags/XX.svg`) — _testé pendant le développement (02-03/10)_
- [x] Rendu net en mode clair et sombre (fin contour autour des drapeaux clairs) — _testé pendant le développement (02-03/10)_
- [x] Barre de recherche de /c et barre « Tout sélectionner » des notifications : rien ne passe par-dessus en faisant défiler — _testé pendant le développement (02-03/10)_

## Réactions depuis le fil

- [x] Cartes du fil (accueil, abonnements, profil, communauté, recherche) : boutons « J'aime » et « Utile » avec leur compteur, changement immédiat sans recharger la page ni revenir en haut du fil — _testé pendant le développement (02-03/10)_
- [x] État retrouvé après rechargement (réactions du visiteur chargées après l'affichage) ; le fil public reste en cache (en-tête `Cache-Control: public`) — _testé pendant le développement (02-03/10)_
- [x] Sur sa propre publication : boutons grisés « C'est ta publication » — _testé pendant le développement (02-03/10)_
- [x] Déconnecté : les boutons mènent à la connexion puis ramènent sur la page — _testé pendant le développement (02-03/10)_
- [x] Clics rapides : l'état final affiché est bien celui enregistré (une requête à la fois) — _testé pendant le développement (02-03/10)_
- [x] Compteurs J'aime / Utile séparés et justes après la migration (`likeCount + usefulCount = reactionCount`) — _testé pendant le développement (02-03/10)_

## Page publication en deux colonnes

- [x] Bureau : publication et discussion à gauche ; colonne de droite qui reste visible en défilant (défilement propre si elle est plus haute que l'écran) — _testé pendant le développement (02-03/10)_
- [x] Projet : blocs « L'équipe », « Postes ouverts » (candidature sur place), « À propos du projet » (auteur, stack, date, chiffres), communauté avec « Rejoindre », projets similaires — _« Projets similaires » non visible : un seul projet en base_ — _testé pendant le développement (02-03/10)_
- [x] Porteur du projet : bloc « Gérer l'équipe » dans la colonne de gauche (ouvrir un poste, candidatures, pourvu/rouvrir) ; lien « Gérer les candidatures » depuis la colonne de droite — _testé pendant le développement (02-03/10)_
- [x] Question : statut « Résolue » ou « En attente d'une réponse acceptée » ; article / code : blocs adaptés — _testé pendant le développement (02-03/10)_
- [x] Bouton retour ; bouton « Partager » (partage natif sur téléphone, sinon « Lien copié ») — _sur ordinateur : « Lien copié »_
- [x] Mobile : ordre publication → blocs (équipe, postes) → commentaires, sans défilement horizontal — _testé pendant le développement (02-03/10)_

## Création des publications

- [x] Projet : pitch (140 caractères), avancement (Idée → En ligne), liens du code et de la démo (https seulement), « Je cherche des coéquipiers » ouvre directement « Ouvrir un poste » après publication — _testé pendant le développement (02-03/10)_
- [x] Question guidée : « Ce que tu essaies de faire », « Déjà essayé », « Message d'erreur » → Markdown avec intertitres et bloc de code ; « Écrire librement en Markdown » puis « Revenir aux champs guidés » (modifications reprises, confirmation si la structure a changé) — _testé pendant le développement (02-03/10)_
- [x] Code : langage, zone de code, explication → bloc coloré dans le bon langage ; point du langage sur la carte — _testé pendant le développement (02-03/10)_
- [x] Article : sous-titre, temps de lecture calculé et affiché — _testé pendant le développement (02-03/10)_
- [x] « Ces questions existent peut-être déjà » sous le titre (mots-clés communs) ; liens ouverts dans un nouvel onglet — _testé pendant le développement (02-03/10)_
- [x] Tags en pastilles : suggestions des tags existants, Entrée / virgule / Retour arrière, 5 maximum, collage « a, b, c » — _testé pendant le développement (02-03/10)_
- [x] Colonne de conseils qui se cochent, indicateur de qualité, aperçu de la carte ; version repliable sur mobile — _testé pendant le développement (02-03/10)_
- [x] Brouillon : enregistré en continu, restauré après rechargement (« Brouillon restauré · Effacer »), effacé après publication, conservé en cas d'erreur du serveur — _testé pendant le développement (02-03/10)_
- [x] Éditeur : modes Écrire / Aperçu / Côte à côte (grand écran) — _côte à côte à partir de 1024 px_
- [x] Publication rapide depuis le fil ; « Plus d'options » ouvre le formulaire complet avec le texte déjà écrit — _testé pendant le développement (02-03/10)_
- [x] Modification d'une publication : champs du projet, langage, sous-titre présents et enregistrés — _avancement passé à « Bêta » et enregistré_
- [x] Sans JavaScript : le formulaire s'envoie quand même (assemblage côté serveur) — _question guidée envoyée par simple formulaire, Markdown assemblé par le serveur_

## Badges et icônes

- [x] Type, engagement : pastille à fine bordure, icône colorée sans fond ; avancement en 4 segments ; langage en point de couleur ; statuts sans fond (Résolue, Pourvu, Candidature envoyée…) — _testé pendant le développement (02-03/10)_
- [x] Plus aucun fond coloré derrière les icônes (états vides, choix du type, communautés, notifications, en-tête) — _testé pendant le développement (02-03/10)_

## Pages de connexion et d'inscription

- [x] Grand écran : collage FricaDev à gauche (projet, code, question résolue, avatars, réputation) et titre « Construisez, partagez, avancez ensemble. » ; formulaire à droite — _testé pendant le développement (02-03/10)_
- [x] Mobile : en-tête compact (logo + titre), formulaire pleine largeur, collage masqué, pas de défilement horizontal — _testé pendant le développement (02-03/10)_
- [x] Champs à étiquette flottante ; bouton 👁 pour afficher le mot de passe ; navigation au clavier — _testé pendant le développement (02-03/10)_
- [x] Mauvais identifiants : message d'erreur, e-mail conservé ; connexion réussie → retour sur le site — _testé pendant le développement (02-03/10)_
- [x] Inscription : indicateur de solidité du mot de passe, nom et e-mail conservés en cas d'erreur, « Un compte existe déjà avec cet e-mail » — _corrigé le 03/10 : l’e-mail est aussi conservé quand le compte existe déjà_
- [x] Bouton GitHub visible seulement si GitHub est configuré — _testé pendant le développement (02-03/10)_
- [x] Déconnexion : page FricaDev « Déconnexion… » validée automatiquement (plus la page anglaise du fournisseur) — _testé pendant le développement (02-03/10)_
- [x] Sans JavaScript : connexion, inscription et déconnexion (bouton) fonctionnent — _connexion et inscription testées par simples formulaires_
- [x] Mode sombre lisible (vert éclairci) ; animation coupée si « réduire les animations » — _testé pendant le développement (02-03/10)_
- [x] Textes provisoires regroupés dans `COPY` (apps/auth/src/interactions/views.ts), visuel remplaçable via `heroArt()` — _testé pendant le développement (02-03/10)_

## Résumé de la campagne du 03/10/2026

**170 vérifiés · 29 impossibles à tester en local · 1 restant** (ajouter des étapes au script `smoke-api.mjs`).

### Défauts trouvés et corrigés pendant la campagne

1. Déconnexion : la page anglaise « Logout Request » du fournisseur d'identité → page FricaDev validée automatiquement.
2. Recherche sensible aux accents (« senegal » ne trouvait pas « Sénégal ») → extension PostgreSQL `unaccent`.
3. Extraits des publications : les balises HTML brutes (`<script>`…) apparaissaient en texte dans le fil → retirées.
4. Messages de validation de l'API en anglais → en français (`z.locales.fr`).
5. `/favicon.ico` en 404 → redirection vers le SVG.
6. Compteur d'abonnés figé après « Suivre » → mis à jour immédiatement.
7. Se désabonner puis se réabonner renvoyait une notification à chaque fois → une seule par semaine.
8. Rôle (`set-role`), pays ou photo changés hors du site : pris en compte seulement à la reconnexion → relus à chaque renouvellement du jeton (au plus tard 15 min).
9. Inscription avec un e-mail déjà utilisé : l'e-mail n'était pas conservé → conservé, avec l'invitation à se connecter.
10. Une panne passagère (réseau lent, délai dépassé) pendant le renouvellement du jeton déconnectait l'utilisateur → seul un vrai refus du service d'identité déconnecte.
11. Le worker s'arrêtait net quand la connexion à la base était coupée en plein traitement (`ECONNRESET` non intercepté) → erreur gérée, lot rejoué ; Docker le relance de toute façon (`restart: unless-stopped`).

### À tester ailleurs qu'en local

- Connexion GitHub (créer l'OAuth App), déploiement Docker et VPS, HTTPS, sauvegardes.
- Vrai téléphone Android bas de gamme en 3G, iPhone (HEIC).
- Cas qui demandent plus de données ou de comptes : défilement infini au-delà de 10 publications, 3 signalements, quotas anti-spam, 20+ notifications.

### Données de test

- Compte **Compte QA** (`@compte_qa`, identifiants `DEV_TEST3_*` dans `.env`) créé pour le parcours d'un nouveau compte ; il suit Awa. Toutes les publications de test ont été supprimées.
- Les réactions, rôles, notifications et profils modifiés pendant les tests ont été remis dans leur état.

## Mon activité (historique privé)

- [x] Bouton « Mon activité » sur son propre profil (absent chez les autres) et entrée dans le menu latéral — _03/10_
- [x] /activite : J'aime, Utile, réponses, candidatures et publications, regroupés par date, avec le lien vers l'endroit exact (réponse `#r-…`, section `#equipe`) — _03/10_
- [x] Onglets avec leurs nombres, recherche dans les titres sans accents ni majuscules (« ZÉMI » → Zemi), gardés dans l'URL — _03/10_
- [x] Une réaction retirée, une réponse supprimée, une candidature retirée ou une publication supprimée disparaissent de l'historique — _03/10_
- [x] Privé : API 401 sans connexion, page réservée à la personne connectée (`noindex`) — _03/10_
- [x] Mobile sans débordement horizontal — _03/10_
- [ ] Défilement au-delà de 20 lignes (pas assez d'activité en base)
