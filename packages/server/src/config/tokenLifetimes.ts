// Tempo de vida do access token (JWT). Fonte única: o jwt.ts assina com ele e o
// env.ts valida contra ele (REFRESH_ROTATE_AFTER_SECONDS nunca passa disso).
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60
