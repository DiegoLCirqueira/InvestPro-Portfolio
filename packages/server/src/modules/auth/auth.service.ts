import type { FastifyBaseLogger } from "fastify";
import type { RefreshToken as StoredRefreshToken } from "@prisma/client";
import { INITIAL_ACCOUNT_BALANCE, normalizeCpf } from "@investpro/shared";
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
import { isAccountRateLimited, registerLoginFailure, clearLoginAttempts } from "./lib/loginRateLimit.js";
import { sendPasswordResetEmail, sendPasswordChangedEmail } from "./lib/email.js";
import { logEmailFailure } from "./lib/emailFailureLog.js";
import { isUniqueViolation, uniqueViolationFields } from "../../shared/db/uniqueViolation.js";

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

const emailTakenError = (): AppError => new AppError("EMAIL_TAKEN", "Email já está em uso", 409);

// Conflito de CPF: a resposta é genérica de propósito (nem cita o CPF), pra o
// cadastro não virar consulta de "este CPF já tem conta?".
const registrationConflictError = (): AppError =>
  new AppError("REGISTRATION_CONFLICT", "Não foi possível concluir o cadastro com esses dados", 409);

// O findUnique de e-mail não enxerga um cadastro concorrente que ainda não
// commitou: quem decide é o unique do banco. E-mail duplicado segue EMAIL_TAKEN;
// qualquer outro campo (o CPF) vira o conflito genérico.
function toRegistrationError(err: unknown): unknown {
  if (!isUniqueViolation(err)) return err;
  return uniqueViolationFields(err).includes("email") ? emailTakenError() : registrationConflictError();
}

export async function register(data: RegisterBody): Promise<AuthResult> {
  // E-mail vem primeiro: com e-mail E CPF duplicados a resposta é EMAIL_TAKEN (o
  // comportamento que já existia) e não diz nada do CPF.
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw emailTakenError();

  const passwordHash = await hashPassword(data.password);
  // Guarda só os dígitos: com máscara e sem máscara o mesmo CPF colidiria no unique.
  const cpf = data.cpf ? normalizeCpf(data.cpf) : null;

  const result = await prisma
    .$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: data.email, passwordHash, fullName: data.fullName, cpf },
      });

      // Conta nova já começa com saldo simulado para a demonstração. A
      // fotografia de abertura registra esse saldo como aporte (netFlow), para
      // não virar "rendimento" no gráfico nem na rentabilidade.
      await tx.portfolio.create({
        data: { userId: user.id, balance: INITIAL_ACCOUNT_BALANCE },
      });
      await tx.portfolioSnapshot.create({
        data: {
          userId: user.id,
          equity: INITIAL_ACCOUNT_BALANCE,
          netFlow: INITIAL_ACCOUNT_BALANCE,
          reason: "SIGNUP",
        },
      });

      return user;
    })
    .catch((err) => {
      throw toRegistrationError(err);
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
  if (isAccountRateLimited(data.email)) {
    throw new AppError(
      "ACCOUNT_RATE_LIMITED",
      "Muitas tentativas de login para esta conta. Tente novamente em alguns minutos.",
      429
    );
  }

  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) {
    registerLoginFailure(data.email);
    throw new AppError("INVALID_CREDENTIALS", "Email ou senha inválidos", 401);
  }

  const valid = await verifyPassword(data.password, user.passwordHash);
  if (!valid) {
    registerLoginFailure(data.email);
    throw new AppError("INVALID_CREDENTIALS", "Email ou senha inválidos", 401);
  }

  clearLoginAttempts(data.email);

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

// `refreshToken` ausente = a resposta NÃO deve trocar o cookie: o token atual
// ainda vale (não elegível à rotação, ver isDueForRotation) ou o cliente já tem o
// sucessor (ver refreshWithinReuseGrace).
export interface RefreshResult {
  accessToken: string;
  refreshToken?: string;
  rememberMe: boolean;
}

type RevokedRefreshToken = StoredRefreshToken & { revokedAt: Date };

// Revoga só a FAMÍLIA do token reapresentado (os descendentes daquele login): quem
// roubou/reusou um token perde a sessão comprometida, mas as outras sessões do
// usuário (outros logins/dispositivos) seguem válidas. O evento vai pro log de
// segurança sem o token (só ids e contagem).
async function revokeFamilyOnReuse(stored: RevokedRefreshToken, log?: FastifyBaseLogger): Promise<never> {
  const { count } = await prisma.refreshToken.updateMany({
    where: { familyId: stored.familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  log?.warn(
    {
      event: "refresh_token_reuse_detected",
      userId: stored.userId,
      familyId: stored.familyId,
      reusedTokenId: stored.id,
      rotatedSecondsAgo: Math.round((Date.now() - stored.revokedAt.getTime()) / 1000),
      revokedActiveTokens: count,
    },
    "Reuso de refresh token detectado: família revogada"
  );
  throw new AppError(
    "REFRESH_TOKEN_REUSE_DETECTED",
    "Sessão comprometida, faça login novamente",
    401
  );
}

// Só a família com token ativo ainda é uma sessão viva: logout, troca de senha e
// revogação por reuso real deixam a família sem nenhum token ativo.
async function familyHasActiveToken(familyId: string): Promise<boolean> {
  const active = await prisma.refreshToken.count({
    where: { familyId, revokedAt: null, expiresAt: { gt: new Date() } },
  });
  return active > 0;
}

async function isWithinReuseGrace(stored: RevokedRefreshToken): Promise<boolean> {
  const graceMs = env.REFRESH_REUSE_GRACE_SECONDS * 1000;
  const revokedAgoMs = Date.now() - stored.revokedAt.getTime();
  const isRecentlyRotated = graceMs > 0 && revokedAgoMs <= graceMs;
  if (!isRecentlyRotated || new Date() > stored.expiresAt) return false;

  return familyHasActiveToken(stored.familyId);
}

// Tolerância de reuso: duas abas (ou recarga + renovação) mandam o MESMO cookie
// quase juntas, e a segunda reapresenta um token que a primeira acabou de
// rotacionar. Dentro de uma janela curta isso não é replay: devolve só um access
// token novo, SEM emitir outro refresh token nem tocar na família. O cookie do
// navegador já foi trocado pela primeira resposta (o jar é compartilhado entre
// abas), então nada de credencial persistente sai de uma reapresentação — quem
// copiou o token só ganha um access token de vida curta. Fora da janela, ou com a
// família já sem token ativo (logout/reuso real), vale o comportamento estrito.
async function refreshWithinReuseGrace(
  stored: RevokedRefreshToken,
  log?: FastifyBaseLogger
): Promise<RefreshResult> {
  if (!(await isWithinReuseGrace(stored))) return revokeFamilyOnReuse(stored, log);

  return {
    accessToken: signAccessToken(stored.userId, env.JWT_SECRET),
    rememberMe: stored.rememberMe,
  };
}

// Rotação atômica: o `revokedAt: null` no WHERE deixa só UMA de duas requisições
// simultâneas revogar o token e criar o sucessor; a outra recebe null.
async function rotateRefreshToken(stored: StoredRefreshToken): Promise<RefreshResult | null> {
  const { token: newRefreshToken, tokenHash, expiresAt } = generateRefreshToken(stored.rememberMe);

  const rotated = await prisma.$transaction(async (tx) => {
    const { count } = await tx.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (count === 0) return false;

    await tx.refreshToken.create({
      data: {
        userId: stored.userId,
        tokenHash,
        familyId: stored.familyId,
        rememberMe: stored.rememberMe,
        expiresAt,
      },
    });
    return true;
  });

  if (!rotated) return null;
  return {
    accessToken: signAccessToken(stored.userId, env.JWT_SECRET),
    refreshToken: newRefreshToken,
    rememberMe: stored.rememberMe,
  };
}

// Rotação preguiçosa: só troca o refresh token depois de REFRESH_ROTATE_AFTER_SECONDS.
// Recarregar a página várias vezes seguidas reusa o mesmo cookie, então abortar uma
// resposta não deixa o navegador com um cookie que o servidor já rotacionou.
function isDueForRotation(stored: StoredRefreshToken): boolean {
  return Date.now() - stored.createdAt.getTime() >= env.REFRESH_ROTATE_AFTER_SECONDS * 1000;
}

export async function refresh(token: string, log?: FastifyBaseLogger): Promise<RefreshResult> {
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: hashRefreshToken(token) } });

  if (!stored) {
    throw new AppError("INVALID_REFRESH_TOKEN", "Refresh token inválido ou expirado", 401);
  }

  // Token já rotacionado/revogado sendo reapresentado: replay (token roubado
  // copiado antes da rotação) ou corrida entre abas (ver refreshWithinReuseGrace).
  if (stored.revokedAt) {
    return refreshWithinReuseGrace({ ...stored, revokedAt: stored.revokedAt }, log);
  }

  if (new Date() > stored.expiresAt) {
    throw new AppError("REFRESH_TOKEN_EXPIRED", "Refresh token expirado", 401);
  }

  if (!isDueForRotation(stored)) {
    return { accessToken: signAccessToken(stored.userId, env.JWT_SECRET), rememberMe: stored.rememberMe };
  }

  const rotated = await rotateRefreshToken(stored);
  if (rotated) return rotated;

  // Perdeu a corrida: outra requisição rotacionou este token agora há pouco.
  const current = await prisma.refreshToken.findUnique({ where: { id: stored.id } });
  if (!current?.revokedAt) {
    throw new AppError("INVALID_REFRESH_TOKEN", "Refresh token inválido ou expirado", 401);
  }
  return refreshWithinReuseGrace({ ...current, revokedAt: current.revokedAt }, log);
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
    logEmailFailure(log, "Erro ao enviar email de redefinição de senha", user.email, err);
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
    logEmailFailure(log, "Erro ao enviar email de confirmação de senha alterada", user.email, err);
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
