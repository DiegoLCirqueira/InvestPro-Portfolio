import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth";

// ready: já dá para decidir (autenticado ou mandar para o login).
// unavailable: não deu para confirmar a sessão agora (429, rede, 5xx) — ela
// não foi perdida, então o usuário deve poder tentar de novo, não ser deslogado.
export type SessionBootstrapStatus = "checking" | "ready" | "unavailable";

/**
 * Cold load: o access token não é persistido (WI-21), então a sessão é
 * restaurada a partir do cookie httpOnly de refresh, que é a única fonte de
 * verdade sobre autenticação.
 */
export function useSessionBootstrap() {
  const refresh = useAuthStore((s) => s.refresh);
  const [status, setStatus] = useState<SessionBootstrapStatus>(() =>
    useAuthStore.getState().isAuthenticated ? "ready" : "checking",
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (useAuthStore.getState().isAuthenticated) return;

    let cancelled = false;
    refresh().then((result) => {
      if (!cancelled) {
        setStatus(result.status === "unavailable" ? "unavailable" : "ready");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [attempt, refresh]);

  const retry = () => {
    setStatus("checking");
    setAttempt((current) => current + 1);
  };

  return { status, retry };
}
