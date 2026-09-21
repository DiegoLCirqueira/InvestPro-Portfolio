const DEFAULT_SKEW_MS = 30_000;

// Só lê o `exp` do payload (a assinatura quem valida é o servidor): serve para saber se o access
// token em memória ainda vale, sem gastar uma requisição.
function expiresAtMs(token: string): number | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const { exp } = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: unknown };
    return typeof exp === "number" ? exp * 1000 : null;
  } catch {
    return null;
  }
}

/** true se o token existe, é legível e ainda vale por mais que a margem (evita usar um token na hora de vencer). */
export function isAccessTokenFresh(
  token: string | null,
  { now = Date.now(), skewMs = DEFAULT_SKEW_MS }: { now?: number; skewMs?: number } = {},
): boolean {
  if (!token) return false;
  const expiresAt = expiresAtMs(token);
  return expiresAt !== null && expiresAt - skewMs > now;
}
