-- WI-27: refresh tokens passam a ser opacos com hash em repouso (mesmo
-- padrão de PasswordResetToken), agrupados por familyId (detecção de
-- reuso), com rememberMe (30d vs 7d) e revokedAt (soft-revoke — necessário
-- pra continuar detectando reuso mesmo depois de um token já ter sido
-- rotacionado). Refresh tokens são sessão efêmera, não dado de negócio:
-- limpar a tabela força relogin, sem tocar em User/Portfolio/Transfer/Order.
DELETE FROM "RefreshToken";

-- DropIndex
DROP INDEX "RefreshToken_token_key";

-- AlterTable
ALTER TABLE "RefreshToken" DROP COLUMN "token",
ADD COLUMN     "tokenHash" TEXT NOT NULL,
ADD COLUMN     "familyId" TEXT NOT NULL,
ADD COLUMN     "rememberMe" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "revokedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_familyId_idx" ON "RefreshToken"("familyId");
