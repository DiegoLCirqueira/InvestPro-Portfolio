import { prisma } from "../../config/database.js";
import { env } from "../../config/env.js";
import type { RegisterBody, LoginBody } from "./auth.schema.js";
import { hashPassword, verifyPassword } from "./lib/password.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyToken,
  type TokenPayload,
} from "./lib/jwt.js";

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface AuthResult {
  user: { id: string; email: string; fullName: string };
  accessToken: string;
  refreshToken: string;
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
  const { token: refreshToken, expiresAt } = signRefreshToken(result.id, env.JWT_REFRESH_SECRET);

  await prisma.refreshToken.create({
    data: {
      userId: result.id,
      token: refreshToken,
      expiresAt,
    },
  });

  return {
    user: stripPassword(result),
    accessToken,
    refreshToken,
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
  const { token: refreshToken, expiresAt } = signRefreshToken(user.id, env.JWT_REFRESH_SECRET);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt,
    },
  });

  return {
    user: stripPassword(user),
    accessToken,
    refreshToken,
  };
}

export async function refresh(token: string): Promise<{ accessToken: string; refreshToken: string }> {
  let payload: TokenPayload;
  try {
    payload = verifyToken(token, env.JWT_REFRESH_SECRET);
  } catch {
    throw new AppError("INVALID_REFRESH_TOKEN", "Refresh token inválido ou expirado", 401);
  }

  if (!payload.sub) {
    throw new AppError("INVALID_REFRESH_TOKEN", "Refresh token inválido", 401);
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token } });
  if (!stored) {
    throw new AppError("INVALID_REFRESH_TOKEN", "Refresh token não encontrado", 401);
  }

  if (new Date() > stored.expiresAt) {
    await prisma.refreshToken.delete({ where: { id: stored.id } });
    throw new AppError("REFRESH_TOKEN_EXPIRED", "Refresh token expirado", 401);
  }

  await prisma.refreshToken.delete({ where: { id: stored.id } });

  const accessToken = signAccessToken(payload.sub, env.JWT_SECRET);
  const { token: newRefreshToken, expiresAt } = signRefreshToken(payload.sub, env.JWT_REFRESH_SECRET);

  await prisma.refreshToken.create({
    data: {
      userId: payload.sub,
      token: newRefreshToken,
      expiresAt,
    },
  });

  return { accessToken, refreshToken: newRefreshToken };
}

export async function logout(token: string): Promise<void> {
  try {
    const stored = await prisma.refreshToken.findUnique({ where: { token } });
    if (stored) {
      await prisma.refreshToken.delete({ where: { id: stored.id } });
    }
  } catch {
    // Silently fail if token not found — logout is best-effort
  }
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
