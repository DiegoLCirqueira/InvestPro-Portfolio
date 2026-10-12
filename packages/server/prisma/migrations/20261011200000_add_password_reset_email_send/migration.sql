-- CreateTable
CREATE TABLE "PasswordResetEmailSend" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetEmailSend_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PasswordResetEmailSend_createdAt_idx" ON "PasswordResetEmailSend"("createdAt");
