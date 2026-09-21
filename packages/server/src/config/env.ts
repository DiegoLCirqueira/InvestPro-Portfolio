import { parseSecondsInRange } from "./duration.js";
import { parseIntegerInRange } from "./integerSetting.js";
import { ACCESS_TOKEN_TTL_SECONDS } from "./tokenLifetimes.js";
import { parseTrustProxy } from "./trustProxy.js";

const DEV_JWT_SECRET = "investpro-dev-secret-change-in-production";
const DEV_JWT_REFRESH_SECRET = "investpro-dev-refresh-secret-change-in-production";

// Valores publicados em .env.example: qualquer um que os use em produção está
// tão exposto quanto quem usa os defaults acima, já que ambos são públicos no
// repositório (AppSec, checkup de 2026-09-16).
const EXAMPLE_JWT_SECRET = "investpro-dev-jwt-secret-2024";
const EXAMPLE_JWT_REFRESH_SECRET = "investpro-dev-refresh-secret-2024";

const INSECURE_JWT_SECRETS = new Set([DEV_JWT_SECRET, EXAMPLE_JWT_SECRET]);
const INSECURE_JWT_REFRESH_SECRETS = new Set([DEV_JWT_REFRESH_SECRET, EXAMPLE_JWT_REFRESH_SECRET]);

const isProduction = process.env.NODE_ENV === "production";

// Cotação de câmbio: idade máxima > TTL fresco, senão a cotação "servida do
// cache em falha" nunca existiria. O teto de idade (10 min) é rígido: uma cotação
// mais velha que isso não serve pra executar câmbio com dinheiro real.
const exchangeRateFreshTtlSeconds = parseSecondsInRange(process.env.EXCHANGE_RATE_FRESH_TTL_SECONDS, {
  name: "EXCHANGE_RATE_FRESH_TTL_SECONDS",
  defaultSeconds: 30,
  minSeconds: 0,
  maxSeconds: 300,
});
const exchangeRateMaxAgeSeconds = parseSecondsInRange(process.env.EXCHANGE_RATE_MAX_AGE_SECONDS, {
  name: "EXCHANGE_RATE_MAX_AGE_SECONDS",
  defaultSeconds: 120,
  minSeconds: 1,
  maxSeconds: 600,
});
if (exchangeRateMaxAgeSeconds < exchangeRateFreshTtlSeconds) {
  throw new Error(
    "EXCHANGE_RATE_MAX_AGE_SECONDS deve ser >= EXCHANGE_RATE_FRESH_TTL_SECONDS."
  );
}
// O câmbio executado é mais exigente que a simulação: aceita cotação mais nova.
const exchangeExecuteMaxAgeSeconds = parseSecondsInRange(process.env.EXCHANGE_EXECUTE_MAX_AGE_SECONDS, {
  name: "EXCHANGE_EXECUTE_MAX_AGE_SECONDS",
  defaultSeconds: 60,
  minSeconds: 1,
  maxSeconds: 600,
});
if (exchangeExecuteMaxAgeSeconds > exchangeRateMaxAgeSeconds) {
  throw new Error(
    "EXCHANGE_EXECUTE_MAX_AGE_SECONDS deve ser <= EXCHANGE_RATE_MAX_AGE_SECONDS."
  );
}

const jwtSecret = process.env.JWT_SECRET ?? DEV_JWT_SECRET;
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET ?? DEV_JWT_REFRESH_SECRET;

if (
  isProduction &&
  (INSECURE_JWT_SECRETS.has(jwtSecret) || INSECURE_JWT_REFRESH_SECRETS.has(jwtRefreshSecret))
) {
  throw new Error(
    "JWT_SECRET and JWT_REFRESH_SECRET MUST be explicitly set in production, " +
      "to a value that is not a development default nor the one committed in .env.example."
  );
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: parseInt(process.env.PORT ?? "3001", 10),
  DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://localhost:5432/investpro?schema=public",
  JWT_SECRET: jwtSecret,
  JWT_REFRESH_SECRET: jwtRefreshSecret,
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  FRONTEND_URL: process.env.FRONTEND_URL ?? "http://localhost:5173",
  RESEND_API_KEY: process.env.RESEND_API_KEY ?? "",
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL ?? "InvestPro <onboarding@resend.dev>",
  BRAPI_API_KEY: process.env.BRAPI_API_KEY ?? "",
  TRUST_PROXY: parseTrustProxy(process.env.TRUST_PROXY, isProduction),
  EXCHANGE_RATE_FRESH_TTL_SECONDS: exchangeRateFreshTtlSeconds,
  EXCHANGE_RATE_MAX_AGE_SECONDS: exchangeRateMaxAgeSeconds,
  EXCHANGE_EXECUTE_MAX_AGE_SECONDS: exchangeExecuteMaxAgeSeconds,
  // Cotação nova que desvia mais que isso da última boa em cache é rejeitada.
  EXCHANGE_RATE_MAX_DEVIATION_PERCENT: parseIntegerInRange(process.env.EXCHANGE_RATE_MAX_DEVIATION_PERCENT, {
    name: "EXCHANGE_RATE_MAX_DEVIATION_PERCENT",
    defaultValue: 15,
    min: 1,
    max: 100,
    unit: "%",
  }),
  // Rotação preguiçosa: o refresh token só é trocado quando tem mais que isso de
  // idade (0 = sempre). Recargas rápidas reusam o mesmo cookie; o teto é o TTL do
  // access token.
  REFRESH_ROTATE_AFTER_SECONDS: parseSecondsInRange(process.env.REFRESH_ROTATE_AFTER_SECONDS, {
    name: "REFRESH_ROTATE_AFTER_SECONDS",
    defaultSeconds: 600,
    minSeconds: 0,
    maxSeconds: ACCESS_TOKEN_TTL_SECONDS,
  }),
  // Tolerância de reuso do refresh token logo após a rotação (abas/recarga simultâneas).
  REFRESH_REUSE_GRACE_SECONDS: parseSecondsInRange(process.env.REFRESH_REUSE_GRACE_SECONDS, {
    name: "REFRESH_REUSE_GRACE_SECONDS",
    defaultSeconds: 10,
    minSeconds: 0,
    maxSeconds: 30,
  }),
} as const;
