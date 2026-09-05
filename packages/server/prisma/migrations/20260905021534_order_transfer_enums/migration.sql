-- CreateEnum
CREATE TYPE "OrderSide" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('MARKET', 'LIMIT', 'STOP');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'OPEN', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TransferType" AS ENUM ('PIX', 'TED', 'DOC');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- AlterTable: converte as colunas existentes para os novos enums no lugar,
-- preservando os dados (os valores string já gravados são um subconjunto dos
-- enums acima, pois a app sempre validou contra os mesmos conjuntos via zod
-- em @investpro/shared). Um valor fora do enum faz o cast falhar e a migration
-- abortar, em vez de descartar dados silenciosamente.
ALTER TABLE "Order" ALTER COLUMN "side" TYPE "OrderSide" USING ("side"::text::"OrderSide");
ALTER TABLE "Order" ALTER COLUMN "type" TYPE "OrderType" USING ("type"::text::"OrderType");
ALTER TABLE "Order" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "status" TYPE "OrderStatus" USING ("status"::text::"OrderStatus");
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable: Transfer
ALTER TABLE "Transfer" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Transfer" ALTER COLUMN "status" TYPE "TransferStatus" USING ("status"::text::"TransferStatus");
ALTER TABLE "Transfer" ALTER COLUMN "status" SET DEFAULT 'PENDING';
ALTER TABLE "Transfer" ALTER COLUMN "type" TYPE "TransferType" USING ("type"::text::"TransferType");
