import type { FastifyInstance } from "fastify";
import {
  type ZodTypeProvider,
  validatorCompiler,
  serializerCompiler,
} from "@fastify/type-provider-zod";
import {
  registerBodySchema,
  loginBodySchema,
  refreshBodySchema,
  authResponseSchema,
  refreshResponseSchema,
  logoutResponseSchema,
  forgotPasswordBodySchema,
  resetPasswordBodySchema,
} from "./auth.schema.js";
import { env } from "../../config/env.js";
import * as authService from "./auth.service.js";
import { startRefreshTokenCleanup } from "./scheduler.js";

const REFRESH_COOKIE = "investpro_refresh_token";
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds
const REFRESH_COOKIE_MAX_AGE_REMEMBER_ME = 30 * 24 * 60 * 60; // WI-27: "lembrar de mim"

const AUTH_RATE_LIMIT = {
  config: {
    rateLimit: {
      max: 5,
      timeWindow: "1 minute" as const,
    },
  },
};

const IS_PRODUCTION = env.NODE_ENV === "production";

function setRefreshCookie(
  reply: { setCookie: Function },
  token: string,
  rememberMe: boolean
): void {
  reply.setCookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    // Front (Vercel) e back (Railway) são domínios diferentes em produção —
    // cookie cross-site só é enviado em fetch/XHR com SameSite=None+Secure
    // (Lax não vai, exceto navegação top-level GET). Local dev continua Lax
    // (mesmo domínio/porta, sem HTTPS). WI-32: causa raiz do logout
    // inesperado ao expirar o access token em produção.
    sameSite: IS_PRODUCTION ? "none" : "lax",
    path: "/api/v1/auth/refresh",
    // WI-27: maxAge do cookie acompanha a duração real do refresh token no
    // banco — senão o navegador descartaria o cookie antes (ou manteria
    // depois) do token de fato expirar.
    maxAge: rememberMe ? REFRESH_COOKIE_MAX_AGE_REMEMBER_ME : REFRESH_COOKIE_MAX_AGE,
  });
}

function clearRefreshCookie(reply: { clearCookie: Function }): void {
  reply.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    // Front (Vercel) e back (Railway) são domínios diferentes em produção —
    // cookie cross-site só é enviado em fetch/XHR com SameSite=None+Secure
    // (Lax não vai, exceto navegação top-level GET). Local dev continua Lax
    // (mesmo domínio/porta, sem HTTPS). WI-32: causa raiz do logout
    // inesperado ao expirar o access token em produção.
    sameSite: IS_PRODUCTION ? "none" : "lax",
    path: "/api/v1/auth/refresh",
  });
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.setValidatorCompiler(validatorCompiler);
  r.setSerializerCompiler(serializerCompiler);

  r.post(
    "/api/v1/auth/register",
    {
      ...AUTH_RATE_LIMIT,
      schema: {
        tags: ["Auth"],
        summary: "Registrar novo usuário",
        description: "Cria uma nova conta de usuário no InvestPro.",
        body: registerBodySchema,
        response: {
          201: authResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const result = await authService.register(request.body);
      setRefreshCookie(reply, result.refreshToken, result.rememberMe);
      reply.status(201);
      return { user: result.user, accessToken: result.accessToken };
    }
  );

  r.post(
    "/api/v1/auth/login",
    {
      ...AUTH_RATE_LIMIT,
      schema: {
        tags: ["Auth"],
        summary: "Autenticar usuário",
        description: "Realiza login e retorna access token.",
        body: loginBodySchema,
        response: {
          200: authResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const result = await authService.login(request.body);
      setRefreshCookie(reply, result.refreshToken, result.rememberMe);
      return { user: result.user, accessToken: result.accessToken };
    }
  );

  r.post(
    "/api/v1/auth/refresh",
    {
      ...AUTH_RATE_LIMIT,
      schema: {
        tags: ["Auth"],
        summary: "Renovar access token",
        description:
          "Utiliza o refresh token (cookie httpOnly) para gerar novo access token.",
        body: refreshBodySchema,
        response: {
          200: refreshResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const token = (request.cookies as Record<string, string | undefined>)[REFRESH_COOKIE];
      if (!token) {
        throw new authService.AppError("MISSING_REFRESH_TOKEN", "Refresh token ausente", 401);
      }

      const result = await authService.refresh(token);
      setRefreshCookie(reply, result.refreshToken, result.rememberMe);
      return { accessToken: result.accessToken };
    }
  );

  r.post(
    "/api/v1/auth/logout",
    {
      ...AUTH_RATE_LIMIT,
      schema: {
        tags: ["Auth"],
        summary: "Encerrar sessão",
        description: "Remove o refresh token e encerra a sessão do usuário.",
        response: {
          200: logoutResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const token = (request.cookies as Record<string, string | undefined>)[REFRESH_COOKIE];
      if (token) {
        await authService.logout(token);
      }
      clearRefreshCookie(reply);
      return { message: "Sessão encerrada com sucesso" };
    }
  );

  r.post(
    "/api/v1/auth/forgot-password",
    {
      ...AUTH_RATE_LIMIT,
      schema: {
        tags: ["Auth"],
        summary: "Solicitar redefinição de senha",
        description:
          "Envia um email com link de redefinição de senha, caso o email exista. Sempre responde 200 com mensagem genérica, para não revelar se o email está cadastrado.",
        body: forgotPasswordBodySchema,
        response: {
          200: logoutResponseSchema,
        },
      },
    },
    async (request) => {
      await authService.forgotPassword(request.body.email, request.log);
      return {
        message: "Se o email existir em nossa base, você receberá as instruções em instantes.",
      };
    }
  );

  r.post(
    "/api/v1/auth/reset-password",
    {
      ...AUTH_RATE_LIMIT,
      schema: {
        tags: ["Auth"],
        summary: "Redefinir senha",
        description:
          "Redefine a senha do usuário a partir do token recebido por email. Invalida o token, os demais tokens de reset pendentes e todos os refresh tokens ativos do usuário.",
        body: resetPasswordBodySchema,
        response: {
          200: logoutResponseSchema,
        },
      },
    },
    async (request) => {
      await authService.resetPassword(request.body.token, request.body.newPassword, request.log);
      return { message: "Senha redefinida com sucesso" };
    }
  );

  startRefreshTokenCleanup(app.log);
}
