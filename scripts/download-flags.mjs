// Télécharge les drapeaux des pays de FricaDev (SVG du domaine public) depuis le Flag CDN
// de REST Countries, pour les servir nous-mêmes : aucun service extérieur au moment de l'affichage.
// Le Flag CDN est libre et sans clé ; l'API REST Countries (avec clé) n'est pas utilisée ici.
// Usage : node scripts/download-flags.mjs   (à relancer seulement si on ajoute un pays)
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const countries = await readFile('apps/web/app/lib/countries.ts', 'utf8');
const codes = [...countries.matchAll(/^\s+([A-Z]{2}): '/gm)].map((m) => m[1]);
const outDir = 'apps/web/public/flags';
await mkdir(outDir, { recursive: true });

for (const code of codes) {
  const url = `https://flags.restcountries.com/v5/svg/${code.toLowerCase()}.svg`;
  const res = await fetch(url);
  const svg = await res.text();
  if (!res.ok || !svg.includes('<svg')) throw new Error(`${code} : ${res.status} ${url}`);
  // Un SVG peut contenir du script : on refuse tout fichier qui en contient.
  if (/<script|on\w+=|javascript:/i.test(svg)) throw new Error(`${code} : SVG suspect`);
  await writeFile(`${outDir}/${code}.svg`, svg);
  console.log(`✓ ${code} (${(svg.length / 1024).toFixed(1)} Ko)`);
}
console.log(`${codes.length} drapeaux enregistrés dans ${outDir}`);
