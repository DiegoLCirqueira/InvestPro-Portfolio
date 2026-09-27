-- Perfil de investidor (questionário) no usuário.
CREATE TYPE "InvestorProfile" AS ENUM ('CONSERVATIVE', 'MODERATE', 'AGGRESSIVE');

ALTER TABLE "User"
  ADD COLUMN "investorProfile" "InvestorProfile",
  ADD COLUMN "investorProfileScore" INTEGER,
  ADD COLUMN "investorProfileAt" TIMESTAMP(3);

-- Fotografia da abertura da conta (saldo inicial como aporte).
ALTER TYPE "SnapshotReason" ADD VALUE 'SIGNUP';
