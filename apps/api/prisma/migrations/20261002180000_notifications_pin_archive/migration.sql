-- Vocabulaire plus parlant : « Épinglées » et « Archivées » (comme WhatsApp et Gmail)
ALTER TABLE "Notification" RENAME COLUMN "savedAt" TO "pinnedAt";
ALTER TABLE "Notification" RENAME COLUMN "doneAt" TO "archivedAt";
ALTER INDEX "Notification_userId_doneAt_createdAt_idx" RENAME TO "Notification_userId_archivedAt_createdAt_idx";
