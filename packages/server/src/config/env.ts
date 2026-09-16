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
} as const;
