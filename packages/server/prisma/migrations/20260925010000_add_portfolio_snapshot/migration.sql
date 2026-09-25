-- CreateEnum
CREATE TYPE "SnapshotReason" AS ENUM ('DAILY', 'TOPUP', 'TRANSFER', 'ORDER', 'EXCHANGE', 'SAVINGS', 'BACKFILL');

-- CreateTable
CREATE TABLE "PortfolioSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "equity" DECIMAL(15,2) NOT NULL,
    "netFlow" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "reason" "SnapshotReason" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PortfolioSnapshot_userId_createdAt_idx" ON "PortfolioSnapshot"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "PortfolioSnapshot" ADD CONSTRAINT "PortfolioSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

