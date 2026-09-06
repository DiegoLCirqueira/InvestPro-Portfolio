import type { FastifyBaseLogger } from "fastify";
import { prisma } from "../../config/database.js";
import { env } from "../../config/env.js";
import type { RegisterBody, LoginBody } from "./auth.schema.js";
import { hashPassword, verifyPassword } from "./lib/password.js";
import { signAccessToken } from "./lib/jwt.js";
import {
  generateRefreshToken,
  hashRefreshToken,
  newRefreshTokenFamilyId,
} from "./lib/refreshToken.js";
import { generatePasswordResetToken, hashResetToken } from "./lib/resetToken.js";
import { isEmailRateLimited } from "./lib/emailRateLimit.js";
import { sendPasswordResetEmail, sendPasswordChangedEmail } from "./lib/email.js";

interface AuthResult {
  user: { id: string; email: string; fullName: string };
  accessToken: string;
  refreshToken: string;
  rememberMe: boolean;
}

function stripPassword<T extends { passwordHash?: string }>(obj: T): Omit<T, "passwordHash"> {
  const { passwordHash: _, ...rest } = obj;
  return rest;
}

export async function register(data: RegisterBody): Promise<AuthResult> {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new AppError("EMAIL_TAKEN", "Email já está em uso", 409);
  }

  const passwordHash = await hashPassword(data.password);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: data.email,
        passwordHash,
        fullName: data.fullName,
        cpf: data.cpf ?? null,
      },
    });

    await tx.portfolio.create({
      data: { userId: user.id },
    });

    return user;
  });

  const accessToken = signAccessToken(result.id, env.JWT_SECRET);
  const { token: refreshToken, tokenHash, expiresAt } = generateRefreshToken(false);

  await prisma.refreshToken.create({
    data: {
      userId: result.id,
      tokenHash,
      familyId: newRefreshTokenFamilyId(),
      rememberMe: false,
      expiresAt,
    },
  });

  return {
    user: stripPassword(result),
    accessToken,
    refreshToken,
    rememberMe: false,
  };
}

export async function login(data: LoginBody): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) {
    throw new AppError("INVALID_CREDENTIALS", "Email ou senha inválidos", 401);
  }

  const valid = await verifyPassword(data.password, user.passwordHash);
  if (!valid) {
    throw new AppError("INVALID_CREDENTIALS", "Email ou senha inválidos", 401);
  }

  const accessToken = signAccessToken(user.id, env.JWT_SECRET);
  const rememberMe = data.rememberMe ?? false;
  const { token: refreshToken, tokenHash, expiresAt } = generateRefreshToken(rememberMe);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      familyId: newRefreshTokenFamilyId(),
      rememberMe,
      expiresAt,
    },
  });

  return {
    user: stripPassword(user),
    accessToken,
    refreshToken,
    rememberMe,
  };
}

export async function refresh(
  token: string
): Promise<{ accessToken: string; refreshToken: string; rememberMe: boolean }> {
  const tokenHash = hashRefreshToken(token);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!stored) {
    throw new AppError("INVALID_REFRESH_TOKEN", "Refresh token inválido ou expirado", 401);
  }

  // Token já rotacionado/revogado sendo reapresentado: sinal de replay (token
  // roubado copiado antes da rotação). Revoga TODOS os refresh tokens ativos
  // do usuário (não só a família), forçando novo login em todo dispositivo.
  if (stored.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new AppError(
      "REFRESH_TOKEN_REUSE_DETECTED",
      "Sessão comprometida, faça login novamente",
      401
    );
  }

  if (new Date() > stored.expiresAt) {
    throw new AppError("REFRESH_TOKEN_EXPIRED", "Refresh token expirado", 401);
  }

  const accessToken = signAccessToken(stored.userId, env.JWT_SECRET);
  const {
    token: newRefreshToken,
    tokenHash: newTokenHash,
    expiresAt,
  } = generateRefreshToken(stored.rememberMe);

  await prisma.$transaction(async (tx) => {
    await tx.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    await tx.refreshToken.create({
      data: {
        userId: stored.userId,
        tokenHash: newTokenHash,
        familyId: stored.familyId,
        rememberMe: stored.rememberMe,
        expiresAt,
      },
    });
  });

  return { accessToken, refreshToken: newRefreshToken, rememberMe: stored.rememberMe };
}

export async function logout(token: string): Promise<void> {
  // Apaga (não só revoga): logout é invalidação final e deliberada, sem
  // ambiguidade de reuso pra detectar — igual era antes do WI-27.
  const tokenHash = hashRefreshToken(token);
  await prisma.refreshToken.deleteMany({ where: { tokenHash } });
}

export async function forgotPassword(email: string, log: FastifyBaseLogger): Promise<void> {
  if (isEmailRateLimited(email)) return;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;

  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id, usedAt: null },
  });

  const { token, tokenHash, expiresAt } = generatePasswordResetToken();
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  const resetLink = `${env.FRONTEND_URL}/reset-password?token=${token}`;
  void sendPasswordResetEmail(user.email, resetLink).catch((err) => {
    log.error({ err }, "Erro ao enviar email de redefinição de senha");
  });
}

export async function resetPassword(
  token: string,
  newPassword: string,
  log: FastifyBaseLogger
): Promise<void> {
  const tokenHash = hashResetToken(token);
  const now = new Date();
  const passwordHash = await hashPassword(newPassword);

  const user = await prisma.$transaction(async (tx) => {
    // updateMany com WHERE usedAt/expiresAt é atômico no nível do banco: só uma
    // requisição concorrente com o mesmo token consegue "reivindicar" o registro,
    // evitando a race condition de duas requests usando o mesmo token ao mesmo tempo.
    const claimed = await tx.passwordResetToken.updateMany({
      where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });

    if (claimed.count === 0) {
      throw new AppError("INVALID_RESET_TOKEN", "Token inválido ou expirado", 400);
    }

    const record = await tx.passwordResetToken.findUniqueOrThrow({ where: { tokenHash } });

    const updatedUser = await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });

    // Apaga (não só revoga): troca de senha é invalidação final e deliberada,
    // sem ambiguidade de reuso pra detectar — igual era antes do WI-27.
    await tx.refreshToken.deleteMany({ where: { userId: record.userId } });
    await tx.passwordResetToken.deleteMany({
      where: { userId: record.userId, usedAt: null },
    });

    return updatedUser;
  });

  void sendPasswordChangedEmail(user.email).catch((err) => {
    log.error({ err }, "Erro ao enviar email de confirmação de senha alterada");
  });
}

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = "AppError";
  }
}
