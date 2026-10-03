// Donne un rôle à un utilisateur (modération).
// Usage : npm run set-role -w @fricadev/api -- <pseudo> <USER|MODERATOR|ADMIN>
import { PrismaClient } from '../generated/prisma/index.js';

const [handle, role = 'ADMIN'] = process.argv.slice(2);
if (!handle || !['USER', 'MODERATOR', 'ADMIN'].includes(role)) {
  console.error('Usage : npm run set-role -w @fricadev/api -- <pseudo> <USER|MODERATOR|ADMIN>');
  process.exit(1);
}
const db = new PrismaClient();
const user = await db.user.update({
  where: { handle },
  data: { role: role as 'USER' | 'MODERATOR' | 'ADMIN' },
});
console.log(`@${user.handle} est maintenant ${user.role}.`);
await db.$disconnect();
