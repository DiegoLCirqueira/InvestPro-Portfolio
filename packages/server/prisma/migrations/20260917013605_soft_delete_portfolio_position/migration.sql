-- DropForeignKey
ALTER TABLE "Portfolio" DROP CONSTRAINT "Portfolio_userId_fkey";

-- DropForeignKey
ALTER TABLE "Position" DROP CONSTRAINT "Position_portfolioId_fkey";

-- AlterTable
ALTER TABLE "Portfolio" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Position" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "Portfolio" ADD CONSTRAINT "Portfolio_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
