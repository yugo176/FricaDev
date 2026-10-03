-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "codePreview" TEXT,
ADD COLUMN     "excerpt" TEXT NOT NULL DEFAULT '';
