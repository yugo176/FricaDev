-- CreateEnum
CREATE TYPE "OpeningStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "Commitment" AS ENUM ('VOLUNTEER', 'PAID', 'PARTNER');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "TeamOpening" (
    "id" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "skills" TEXT[],
    "commitment" "Commitment" NOT NULL DEFAULT 'VOLUNTEER',
    "remote" BOOLEAN NOT NULL DEFAULT true,
    "status" "OpeningStatus" NOT NULL DEFAULT 'OPEN',
    "applicationCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamOpening_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamApplication" (
    "id" UUID NOT NULL,
    "openingId" UUID NOT NULL,
    "applicantId" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "TeamApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMember" (
    "postId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("postId","userId")
);

-- CreateIndex
CREATE INDEX "TeamOpening_status_createdAt_idx" ON "TeamOpening"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "TeamOpening_postId_idx" ON "TeamOpening"("postId");

-- CreateIndex
CREATE INDEX "TeamApplication_applicantId_createdAt_idx" ON "TeamApplication"("applicantId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "TeamApplication_openingId_applicantId_key" ON "TeamApplication"("openingId", "applicantId");

-- CreateIndex
CREATE INDEX "ProjectMember_userId_idx" ON "ProjectMember"("userId");

-- AddForeignKey
ALTER TABLE "TeamOpening" ADD CONSTRAINT "TeamOpening_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamApplication" ADD CONSTRAINT "TeamApplication_openingId_fkey" FOREIGN KEY ("openingId") REFERENCES "TeamOpening"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamApplication" ADD CONSTRAINT "TeamApplication_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

