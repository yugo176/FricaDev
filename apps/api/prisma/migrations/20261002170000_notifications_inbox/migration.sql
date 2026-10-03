-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "doneAt" TIMESTAMP(3),
ADD COLUMN     "postId" UUID,
ADD COLUMN     "savedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Notification_userId_doneAt_createdAt_idx" ON "Notification"("userId", "doneAt", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Notification_userId_postId_idx" ON "Notification"("userId", "postId");


-- Notifications existantes : copier la publication concernée depuis le payload
UPDATE "Notification"
SET "postId" = ("payload"->>'postId')::uuid
WHERE "payload"->>'postId' ~ '^[0-9a-f-]{36}$';
