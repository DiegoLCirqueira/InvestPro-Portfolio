-- CreateTable
CREATE TABLE "BalanceTopUp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "balanceAfter" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BalanceTopUp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BalanceTopUp_userId_createdAt_idx" ON "BalanceTopUp"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "BalanceTopUp" ADD CONSTRAINT "BalanceTopUp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalanceTopUp" ADD CONSTRAINT "BalanceTopUp_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
