// Contrôle bloquant des licences (art. 6 du règlement CADEV) : aucune licence à réciprocité.
// Usage : npm run licenses
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const FORBIDDEN = /\b(A?GPL|LGPL|SSPL|BUSL|BSL-1|EUPL|CC-BY-SA|OSL|CPAL|RPL|Sleepycat)\b/i;
// Copyleft faible : à faire valider avant d'accepter (allowlist motivée ci-dessous).
const REVIEW = /\b(MPL|EPL|CDDL|CPL)\b/i;
const ALLOWLIST_FILE = new URL('./license-allowlist.json', import.meta.url);

const allowlist = existsSync(ALLOWLIST_FILE)
  ? JSON.parse(readFileSync(ALLOWLIST_FILE, 'utf8'))
  : {};

const output = execFileSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['license-checker-rseidelsohn', '--json', '--excludePrivatePackages'],
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, shell: process.platform === 'win32' },
);
const packages = JSON.parse(output);

const forbidden = [];
const review = [];
for (const [name, info] of Object.entries(packages)) {
  const licenses = Array.isArray(info.licenses)
    ? info.licenses.join(' OR ')
    : String(info.licenses);
  const pkg = name.replace(/@[^@]+$/, '');
  if (allowlist[pkg]) continue;
  // Une double licence « X OR MIT » reste utilisable sous la licence permissive.
  const permissiveAlternative = / OR /i.test(licenses) && /(MIT|Apache|BSD|ISC)/i.test(licenses);
  if (FORBIDDEN.test(licenses) && !permissiveAlternative) forbidden.push(`${name} → ${licenses}`);
  else if (REVIEW.test(licenses) && !permissiveAlternative) review.push(`${name} → ${licenses}`);
  else if (/UNKNOWN|UNLICENSED|Custom/i.test(licenses)) review.push(`${name} → ${licenses}`);
}

console.log(`${Object.keys(packages).length} paquets analysés.`);
if (review.length) {
  console.log(
    `\nÀ vérifier (${review.length}) — ajouter dans scripts/license-allowlist.json avec une justification :`,
  );
  review.forEach((line) => console.log(`  ⚠ ${line}`));
}
if (forbidden.length) {
  console.error(`\nLicences interdites (${forbidden.length}) :`);
  forbidden.forEach((line) => console.error(`  ✗ ${line}`));
  process.exit(1);
}
if (review.length) process.exit(1);
console.log('Aucune licence interdite.');
