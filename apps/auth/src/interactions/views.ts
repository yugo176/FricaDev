const WEB_URL = process.env.WEB_URL ?? 'http://localhost:5173';

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

/**
 * Tous les textes des pages d'identité, au même endroit : provisoires, faciles à remplacer.
 * Le mot entre * * du titre est mis en couleur.
 */
const COPY = {
  tagline: 'Le réseau des développeurs de tout le continent.',
  footer: 'Fait en Afrique, pour les devs',
  login: {
    hero: 'Construisez, partagez, avancez *ensemble.*',
    title: 'Se connecter à FricaDev',
    email: 'E-mail',
    password: 'Mot de passe',
    submit: 'Se connecter',
    newHere: 'Nouveau sur FricaDev ?',
    register: 'Créer un nouveau compte',
  },
  register: {
    hero: 'Rejoignez les devs de *tout le continent.*',
    title: 'Créer un compte',
    subtitle: 'C’est gratuit, et ça le restera.',
    name: 'Nom affiché',
    email: 'E-mail',
    password: 'Mot de passe (10 caractères minimum)',
    submit: 'Créer mon compte',
    legal:
      'En créant un compte, tu acceptes les règles de la communauté : bienveillance, entraide et respect.',
    already: 'Déjà inscrit ?',
    login: 'Se connecter',
  },
  github: 'Continuer avec GitHub',
  error: { title: 'Connexion impossible', back: 'Retour à FricaDev' },
};

const LOGO = `<svg width="36" height="36" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#0F6E56"/><path d="M18 18h12a14 14 0 0 1 0 28H18z" fill="none" stroke="#E1F5EE" stroke-width="6" stroke-linejoin="round"/><circle cx="46" cy="46" r="5" fill="#EF9F27"/></svg>`;

// Icônes (tracés Lucide, licence ISC) dessinées dans la page : aucune image externe.
const icon = (paths: string, size = 14) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const ICONS = {
  rocket: icon(
    '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>',
  ),
  users: icon(
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  ),
  check: icon('<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>'),
  award: icon('<circle cx="12" cy="8" r="6"/><path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11"/>'),
  heart: icon(
    '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    18,
  ),
  eye: icon(
    '<path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/>',
    18,
  ),
};

const GITHUB_ICON = `<svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8"/></svg>`;

/**
 * Visuel de la colonne de gauche : un collage d'objets FricaDev (projet, code, question résolue,
 * avatars, réputation). À remplacer par une vraie image plus tard :
 * `<img src="/assets/hero.webp" alt="" class="hero-img" />` (fichier dans apps/auth/public).
 */
function heroArt() {
  const stage = [1, 1, 1, 0].map((on) => `<i class="${on ? 'on' : ''}"></i>`).join('');
  return `<div class="art" aria-hidden="true">
  <div class="tile project float-a">
    <div class="row"><span class="name"><span class="c-indigo">${ICONS.rocket}</span> Zemi</span><span class="stage">${stage}</span></div>
    <p>Livraison de repas sur le campus, paiement mobile money.</p>
    <p class="hire">${ICONS.users} Recrute un dev backend</p>
  </div>
  <div class="tile code float-b">
    <pre><span class="k">def</span> <span class="f">fcfa</span>(m):
  <span class="k">return</span> <span class="s">f"{m:,} F"</span></pre>
    <p><span class="dot"></span> Python</p>
  </div>
  <div class="tile question float-c">
    <p class="q">Double crédit sur un webhook Wave ?</p>
    <p class="ok">${ICONS.check} Résolue · 4 réponses</p>
  </div>
  <div class="pill rep float-b">${ICONS.award} +15 réputation</div>
  <div class="avatar a1 float-c">AD</div>
  <div class="avatar a2 float-a">KA</div>
  <div class="avatar a3 float-b">MS</div>
  <div class="heart float-a">${ICONS.heart}</div>
</div>`;
}

/** Titre de la colonne de gauche : le mot entre * * est mis en couleur. */
const heroTitle = (text: string) =>
  escape(text).replace(/\*(.+?)\*/g, '<span class="accent">$1</span>');

const STYLES = `
:root { color-scheme: light dark; --brand: #0f6e56; --accent: #0f6e56; --brand-dark: #085041; --brand-soft: #e1f5ee; --ocre: #854f0b; --terre: #d85a30;
  --bg: #ffffff; --panel: #f5f5f4; --card: #ffffff; --border: #e7e5e4; --border-strong: #d6d3d1; --text: #1c1917; --muted: #78716c; --code-bg: #1c1917; }
@media (prefers-color-scheme: dark) { :root { --bg: #0c0a09; --panel: #151210; --card: #1c1917; --border: #292524; --border-strong: #3a3532; --text: #f5f5f4; --muted: #a8a29e; --brand-soft: #0b2e25; --code-bg: #0a0908; --accent: #5dcaa5; } }
* { box-sizing: border-box; }
html, body { height: 100%; }
body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); -webkit-font-smoothing: antialiased; }
a { color: var(--accent); font-weight: 500; text-decoration: none; }
a:hover { text-decoration: underline; }
.page { min-height: 100vh; display: grid; grid-template-columns: 1fr; }
.hero { background: var(--panel); padding: 20px 20px 22px; display: flex; flex-direction: column; gap: 10px; border-bottom: 1px solid var(--border); }
.brand { display: inline-flex; align-items: center; gap: 10px; font-weight: 700; font-size: 20px; letter-spacing: -.01em; color: var(--text); }
.brand:hover { text-decoration: none; }
.brand b { color: var(--accent); }
.hero h1 { margin: 6px 0 0; font-size: 26px; line-height: 1.1; letter-spacing: -.025em; font-weight: 700; }
.hero h1 .accent { color: var(--accent); }
.hero .tagline { display: none; margin: 0; color: var(--muted); font-size: 15px; }
.art { display: none; }
.side { display: flex; flex-direction: column; justify-content: center; padding: 28px 20px 24px; }
.form-wrap { width: 100%; max-width: 400px; margin: 0 auto; }
.form-wrap h2 { font-size: 22px; font-weight: 650; letter-spacing: -.015em; margin: 0 0 6px; }
.form-wrap .sub { color: var(--muted); margin: 0 0 20px; font-size: 15px; }
.stack { display: grid; gap: 12px; }
.field { position: relative; }
.field input { width: 100%; height: 58px; padding: 24px 16px 8px; border: 1px solid var(--border-strong); border-radius: 14px; font-size: 16px; background: var(--card); color: inherit; outline: none; transition: border-color .15s, box-shadow .15s; }
.field input:focus { border-color: var(--brand); box-shadow: 0 0 0 4px rgb(15 110 86 / .14); }
.field label { position: absolute; left: 17px; top: 19px; font-size: 16px; color: var(--muted); pointer-events: none; transition: top .15s, font-size .15s, color .15s; }
.field input:focus + label, .field input:not(:placeholder-shown) + label { top: 9px; font-size: 12px; }
.field input:focus + label { color: var(--accent); }
.field.has-toggle input { padding-right: 52px; }
.toggle { position: absolute; right: 8px; top: 9px; width: 40px; height: 40px; display: none; align-items: center; justify-content: center; border: 0; border-radius: 10px; background: transparent; color: var(--muted); cursor: pointer; }
.js .toggle { display: flex; }
.toggle:hover { background: rgb(120 113 108 / .1); color: var(--text); }
.toggle[aria-pressed="true"] { color: var(--accent); }
.strength { display: none; align-items: center; gap: 10px; margin-top: -2px; font-size: 12px; color: var(--muted); }
.js .strength { display: flex; }
.strength .bars { display: flex; gap: 4px; }
.strength .bars i { width: 26px; height: 4px; border-radius: 4px; background: var(--border-strong); transition: background .2s; }
.strength[data-level="1"] .bars i:nth-child(-n+1) { background: var(--terre); }
.strength[data-level="2"] .bars i:nth-child(-n+2) { background: #ef9f27; }
.strength[data-level="3"] .bars i:nth-child(-n+3), .strength[data-level="4"] .bars i { background: #1d9e75; }
.btn { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; height: 50px; border-radius: 999px; font-size: 16px; font-weight: 600; cursor: pointer; transition: background .15s, transform .1s, border-color .15s; text-decoration: none; font-family: inherit; }
.btn:hover { text-decoration: none; }
.btn:active { transform: scale(.985); }
.btn-primary { border: 0; background: var(--brand); color: #fff; margin-top: 4px; }
.btn-primary:hover { background: var(--brand-dark); }
.btn-outline { border: 1px solid var(--border-strong); background: transparent; color: var(--text); font-weight: 500; }
.btn-outline:hover { background: rgb(120 113 108 / .08); }
.btn-brand-outline { border: 1px solid var(--accent); background: transparent; color: var(--accent); }
.btn-brand-outline:hover { background: rgb(15 110 86 / .07); }
.sep { display: flex; align-items: center; gap: 12px; color: var(--muted); font-size: 13px; margin: 10px 0 2px; }
.sep::before, .sep::after { content: ''; flex: 1; border-top: 1px solid var(--border); }
.error { color: #b42318; font-size: 14px; padding: 11px 14px; border-radius: 12px; background: #fef3f2; border: 1px solid #fecdca; }
@media (prefers-color-scheme: dark) { .error { background: #2d0f0c; border-color: #5a1d17; color: #fda29b; } }
.legal { font-size: 12px; color: var(--muted); line-height: 1.5; margin: 2px 4px 0; }
.switch { text-align: center; font-size: 14px; color: var(--muted); margin-top: 6px; }
.footer { text-align: center; font-size: 12px; color: var(--muted); margin-top: 28px; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

/* Grand écran : deux colonnes, comme Facebook */
@media (min-width: 900px) {
  .page { grid-template-columns: 1.15fr 1fr; }
  .hero { border-bottom: 0; border-right: 1px solid var(--border); padding: 40px 48px; justify-content: space-between; gap: 24px; }
  .hero h1 { font-size: clamp(44px, 4.6vw, 64px); line-height: 1.02; letter-spacing: -.035em; margin: 0; }
  .hero .tagline { display: block; font-size: 17px; margin-top: 14px; }
  .art { display: block; position: relative; width: 100%; max-width: 520px; height: 330px; margin: 0 auto; }
  .side { padding: 40px 48px; }
}
.tile { position: absolute; background: var(--card); border: 1px solid var(--border); border-radius: 18px; padding: 14px 16px; box-shadow: 0 18px 40px -16px rgb(28 25 23 / .22), 0 2px 6px -2px rgb(28 25 23 / .08); }
.tile p { margin: 8px 0 0; font-size: 13px; color: var(--muted); line-height: 1.45; }
.tile .row { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.tile .name { display: inline-flex; align-items: center; gap: 6px; font-weight: 650; font-size: 15px; }
.c-indigo { color: #534ab7; display: inline-flex; }
@media (prefers-color-scheme: dark) { .c-indigo { color: #7f77dd; } }
.stage { display: inline-flex; gap: 3px; } .stage i { width: 12px; height: 4px; border-radius: 4px; background: var(--border-strong); } .stage i.on { background: #1d9e75; }
.project { left: 30%; top: 4%; width: 250px; }
.project .hire { color: var(--accent); display: inline-flex; align-items: center; gap: 6px; font-weight: 500; }
.code { left: 0; top: 42%; width: 220px; background: var(--code-bg); border-color: var(--code-bg); }
.code pre { margin: 0; font: 12.5px/1.65 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; color: #e7e5e4; }
.code .k { color: #f0997b; } .code .f { color: #9fe1cb; } .code .s { color: #fac775; }
.code p { color: #a8a29e; display: flex; align-items: center; gap: 6px; } .code .dot { width: 9px; height: 9px; border-radius: 50%; background: #3572a5; }
.question { left: 46%; top: 58%; width: 230px; }
.question .q { color: var(--text); font-weight: 600; font-size: 14px; margin: 0; }
.question .ok { color: var(--accent); display: inline-flex; align-items: center; gap: 6px; font-weight: 500; }
.pill { position: absolute; display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; background: var(--card); border: 1px solid var(--border); font-size: 13px; font-weight: 600; color: var(--ocre); box-shadow: 0 10px 24px -12px rgb(28 25 23 / .25); }
@media (prefers-color-scheme: dark) { .pill { color: #ef9f27; } }
.rep { left: 4%; top: 12%; }
.avatar { position: absolute; width: 46px; height: 46px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; border: 3px solid var(--panel); box-shadow: 0 10px 24px -12px rgb(28 25 23 / .3); }
.a1 { right: 2%; top: 6%; background: #faeeda; color: #633806; }
.a2 { right: 0; top: 36%; background: #eeedfe; color: #3c3489; }
.a3 { left: 22%; top: 82%; background: #e1f5ee; color: #085041; }
.heart { position: absolute; right: 8%; top: 74%; width: 52px; height: 52px; border-radius: 50%; background: #d85a30; color: #fff; display: flex; align-items: center; justify-content: center; box-shadow: 0 14px 28px -12px rgb(216 90 48 / .6); }
@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
.float-a { animation: float 6s ease-in-out infinite; }
.float-b { animation: float 7s ease-in-out infinite .8s; }
.float-c { animation: float 8s ease-in-out infinite 1.6s; }
@media (prefers-reduced-motion: reduce) { .float-a, .float-b, .float-c { animation: none; } }
`;

function layout(title: string, hero: string, body: string) {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escape(title)} · FricaDev</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%230F6E56'/%3E%3C/svg%3E" />
<style>${STYLES}</style>
<script src="/assets/auth.js" defer></script>
</head>
<body>
<div class="page">
  <section class="hero">
    <a class="brand" href="${WEB_URL}">${LOGO}<span>Frica<b>Dev</b></span></a>
    ${heroArt()}
    <div>
      <h1>${heroTitle(hero)}</h1>
      <p class="tagline">${escape(COPY.tagline)}</p>
    </div>
  </section>
  <main class="side">
    <div class="form-wrap">
      ${body}
      <p class="footer">${escape(COPY.footer)}</p>
    </div>
  </main>
</div>
</body>
</html>`;
}

/** Champ à étiquette flottante (l'étiquette remonte quand on écrit, sans JavaScript). */
function field(o: {
  id: string;
  label: string;
  type?: string;
  autocomplete: string;
  value?: string;
  attrs?: string;
  toggle?: boolean;
}) {
  return `<div class="field${o.toggle ? ' has-toggle' : ''}">
  <input id="${o.id}" name="${o.id}" type="${o.type ?? 'text'}" autocomplete="${o.autocomplete}" placeholder=" " required${o.value ? ` value="${escape(o.value)}"` : ''} ${o.attrs ?? ''} />
  <label for="${o.id}">${escape(o.label)}</label>
  ${o.toggle ? `<button type="button" class="toggle" data-toggle="${o.id}" aria-label="Afficher le mot de passe" aria-pressed="false">${ICONS.eye}</button>` : ''}
</div>`;
}

const errorBox = (error?: string) =>
  error ? `<div class="error" role="alert">${escape(error)}</div>` : '';

export interface ViewOptions {
  github: boolean;
}

function githubButton(uid: string, options: ViewOptions) {
  if (!options.github) return '';
  return `<a class="btn btn-outline" href="/interaction/${escape(uid)}/github">${GITHUB_ICON} ${escape(COPY.github)}</a>`;
}

/** Déconnexion : le formulaire du fournisseur, envoyé automatiquement (bouton si JavaScript est coupé). */
export function logoutPage(form: string) {
  return layout(
    'Déconnexion',
    COPY.login.hero,
    `<h2>Déconnexion…</h2>
<p class="sub">À bientôt sur FricaDev.</p>
${form}
<button type="submit" form="op.logoutForm" name="logout" value="yes" class="btn btn-primary" data-autosubmit>Se déconnecter</button>`,
  );
}

export function errorPage(message: string) {
  return layout(
    COPY.error.title,
    COPY.login.hero,
    `<h2>${escape(COPY.error.title)}</h2>
<p class="sub">${escape(message)}</p>
<a class="btn btn-outline" href="${WEB_URL}">${escape(COPY.error.back)}</a>`,
  );
}

export function loginPage(
  uid: string,
  options: ViewOptions,
  error?: string,
  values: { email?: string } = {},
) {
  const c = COPY.login;
  return layout(
    'Connexion',
    c.hero,
    `<h2>${escape(c.title)}</h2>
<form method="post" action="/interaction/${escape(uid)}/login" class="stack" style="margin-top:18px">
  ${field({ id: 'email', label: c.email, type: 'email', autocomplete: 'email', value: values.email, attrs: values.email ? '' : 'autofocus' })}
  ${field({ id: 'password', label: c.password, type: 'password', autocomplete: 'current-password', toggle: true, attrs: values.email ? 'autofocus' : '' })}
  ${errorBox(error)}
  <button type="submit" class="btn btn-primary">${escape(c.submit)}</button>
  ${githubButton(uid, options)}
  <div class="sep"><span>${escape(c.newHere)}</span></div>
  <a class="btn btn-brand-outline" href="/interaction/${escape(uid)}/register">${escape(c.register)}</a>
</form>`,
  );
}

export function registerPage(
  uid: string,
  options: ViewOptions,
  error?: string,
  values: { name?: string; email?: string } = {},
) {
  const c = COPY.register;
  return layout(
    c.title,
    c.hero,
    `<h2>${escape(c.title)}</h2>
<p class="sub">${escape(c.subtitle)}</p>
<form method="post" action="/interaction/${escape(uid)}/register" class="stack">
  ${field({ id: 'name', label: c.name, autocomplete: 'name', value: values.name, attrs: 'minlength="2" autofocus' })}
  ${field({ id: 'email', label: c.email, type: 'email', autocomplete: 'email', value: values.email })}
  ${field({ id: 'password', label: c.password, type: 'password', autocomplete: 'new-password', toggle: true, attrs: 'minlength="10" data-strength="strength"' })}
  <div class="strength" id="strength" data-level="0" aria-live="polite"><span class="bars"><i></i><i></i><i></i><i></i></span><span class="label">Solidité du mot de passe</span></div>
  ${errorBox(error)}
  <button type="submit" class="btn btn-primary">${escape(c.submit)}</button>
  <p class="legal">${escape(c.legal)}</p>
  ${githubButton(uid, options)}
  <div class="switch">${escape(c.already)} <a href="/interaction/${escape(uid)}">${escape(c.login)}</a></div>
</form>`,
  );
}
