-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "likeCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "usefulCount" INTEGER NOT NULL DEFAULT 0;


-- Publications existantes : compteurs calculés à partir des réactions
UPDATE "Post" p SET
  "likeCount" = (SELECT count(*) FROM "Reaction" r WHERE r."postId" = p.id AND r.type = 'LIKE'),
  "usefulCount" = (SELECT count(*) FROM "Reaction" r WHERE r."postId" = p.id AND r.type = 'USEFUL');
