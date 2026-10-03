// Petits bonus des pages d'identité : les formulaires fonctionnent aussi sans ce script.
document.documentElement.classList.add('js');

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-toggle]');
  if (!button) return;
  const input = document.getElementById(button.dataset.toggle);
  const visible = input.type === 'password';
  input.type = visible ? 'text' : 'password';
  button.setAttribute('aria-pressed', String(visible));
  button.setAttribute(
    'aria-label',
    visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe',
  );
  input.focus();
});

// Solidité du mot de passe : longueur, variété des caractères (4 niveaux).
const LABELS = ['Solidité du mot de passe', 'Trop faible', 'Moyen', 'Solide', 'Très solide'];
document.addEventListener('input', (event) => {
  const input = event.target;
  if (!input.dataset || !input.dataset.strength) return;
  const meter = document.getElementById(input.dataset.strength);
  const value = input.value;
  let level = 0;
  if (value.length > 0) {
    const kinds = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(value)).length;
    level =
      value.length < 10 ? 1 : Math.min(4, 1 + (kinds >= 2) + (kinds >= 3) + (value.length >= 14));
  }
  meter.dataset.level = String(level);
  meter.querySelector('.label').textContent = LABELS[level];
});

// Déconnexion : le formulaire du fournisseur d'identité est validé sans attendre de clic.
const autosubmit = document.querySelector('[data-autosubmit]');
if (autosubmit) {
  const form = document.getElementById(autosubmit.getAttribute('form'));
  if (form) form.requestSubmit(autosubmit);
}
