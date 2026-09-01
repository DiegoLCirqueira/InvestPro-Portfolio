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
} from "./auth.schema.js";
import { env } from "../../config/env.js";
import * as authService from "./auth.service.js";

const REFRESH_COOKIE = "investpro_refresh_token";
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

const AUTH_RATE_LIMIT = {
  config: {
    rateLimit: {
      max: 5,
      timeWindow: "1 minute" as const,
    },
  },
};

const IS_PRODUCTION = env.NODE_ENV === "production";

function setRefreshCookie(reply: { setCookie: Function }, token: string): void {
  reply.setCookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax",
    path: "/api/v1/auth/refresh",
    maxAge: REFRESH_COOKIE_MAX_AGE,
  });
}

function clearRefreshCookie(reply: { clearCookie: Function }): void {
  reply.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax",
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
      setRefreshCookie(reply, result.refreshToken);
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
      setRefreshCookie(reply, result.refreshToken);
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
      setRefreshCookie(reply, result.refreshToken);
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
}
