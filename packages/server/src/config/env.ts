const DEV_JWT_SECRET = "investpro-dev-secret-change-in-production";
const DEV_JWT_REFRESH_SECRET = "investpro-dev-refresh-secret-change-in-production";

const isProduction = process.env.NODE_ENV === "production";

const jwtSecret = process.env.JWT_SECRET ?? DEV_JWT_SECRET;
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET ?? DEV_JWT_REFRESH_SECRET;

if (isProduction && (jwtSecret === DEV_JWT_SECRET || jwtRefreshSecret === DEV_JWT_REFRESH_SECRET)) {
  throw new Error(
    "JWT_SECRET and JWT_REFRESH_SECRET MUST be explicitly set in production. " +
      "Do not use the development defaults."
  );
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: parseInt(process.env.PORT ?? "3001", 10),
  DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://localhost:5432/investpro?schema=public",
  JWT_SECRET: jwtSecret,
  JWT_REFRESH_SECRET: jwtRefreshSecret,
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:5173",
} as const;
