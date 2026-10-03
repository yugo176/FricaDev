// Crée les communautés de départ (idempotent).
// Usage : npm run db:seed -w @fricadev/api
import { v7 as uuidv7 } from 'uuid';
import { PrismaClient } from '../generated/prisma/index.js';

const COUNTRIES: [code: string, name: string, slug: string][] = [
  ['DZ', 'Algérie', 'algerie'],
  ['BJ', 'Bénin', 'benin'],
  ['BF', 'Burkina Faso', 'burkina-faso'],
  ['BI', 'Burundi', 'burundi'],
  ['CM', 'Cameroun', 'cameroun'],
  ['CF', 'Centrafrique', 'centrafrique'],
  ['KM', 'Comores', 'comores'],
  ['CG', 'Congo', 'congo'],
  ['CI', 'Côte d’Ivoire', 'cote-divoire'],
  ['DJ', 'Djibouti', 'djibouti'],
  ['GA', 'Gabon', 'gabon'],
  ['GN', 'Guinée', 'guinee'],
  ['GQ', 'Guinée équatoriale', 'guinee-equatoriale'],
  ['MG', 'Madagascar', 'madagascar'],
  ['ML', 'Mali', 'mali'],
  ['MA', 'Maroc', 'maroc'],
  ['MR', 'Mauritanie', 'mauritanie'],
  ['NE', 'Niger', 'niger'],
  ['CD', 'RD Congo', 'rd-congo'],
  ['RW', 'Rwanda', 'rwanda'],
  ['SN', 'Sénégal', 'senegal'],
  ['SC', 'Seychelles', 'seychelles'],
  ['TD', 'Tchad', 'tchad'],
  ['TG', 'Togo', 'togo'],
  ['TN', 'Tunisie', 'tunisie'],
];

const TECH: [slug: string, name: string, description: string][] = [
  ['javascript', 'JavaScript et TypeScript', 'Front, back, outils : tout l’écosystème JS.'],
  ['react', 'React', 'React, Next.js, React Native et leur écosystème.'],
  ['php-laravel', 'PHP et Laravel', 'Laravel, Symfony, WordPress et le PHP moderne.'],
  ['python', 'Python', 'Django, FastAPI, scripts et automatisation.'],
  ['mobile', 'Mobile', 'Flutter, Kotlin, Swift, React Native.'],
  ['ia-data', 'IA et data', 'Machine learning, LLM, data engineering.'],
  ['devops-cloud', 'DevOps et cloud', 'Docker, CI/CD, hébergement, serveurs, cloud africain.'],
  [
    'paiement-mobile',
    'Paiement mobile',
    'Intégrer Wave, Orange Money, MTN MoMo et les agrégateurs.',
  ],
  ['securite', 'Sécurité', 'Sécurité applicative, réseaux, bonnes pratiques.'],
  ['carriere', 'Carrière et freelance', 'Premier emploi, missions, salaires, télétravail.'],
];

const db = new PrismaClient();

for (const [code, name, slug] of COUNTRIES) {
  await db.community.upsert({
    where: { slug },
    create: {
      id: uuidv7(),
      slug,
      name: `Devs ${name}`,
      type: 'COUNTRY',
      countryCode: code,
      description: `La communauté des développeurs du pays : ${name}.`,
    },
    update: {},
  });
}
for (const [slug, name, description] of TECH) {
  await db.community.upsert({
    where: { slug },
    create: { id: uuidv7(), slug, name, type: 'TECH', description },
    update: {},
  });
}

console.log(`${COUNTRIES.length} communautés pays et ${TECH.length} communautés tech prêtes.`);
await db.$disconnect();
