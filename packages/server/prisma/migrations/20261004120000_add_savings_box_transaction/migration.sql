-- CreateEnum
CREATE TYPE "SavingsBoxTransactionType" AS ENUM ('DEPOSIT', 'WITHDRAW', 'ORDER_FUNDING');

-- CreateTable
CREATE TABLE "SavingsBoxTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "SavingsBoxTransactionType" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "balanceAfter" DECIMAL(15,2) NOT NULL,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavingsBoxTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavingsBoxTransaction_userId_createdAt_idx" ON "SavingsBoxTransaction"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "SavingsBoxTransaction" ADD CONSTRAINT "SavingsBoxTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

