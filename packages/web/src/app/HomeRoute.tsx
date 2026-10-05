import type { ReactNode } from "react";
import { useMatch } from "react-router-dom";
import { SessionLoading } from "@/app/SessionLoading";
import { useHadSession, useSessionBootstrap } from "@/app/use-session-bootstrap";
import { useAuthStore } from "@/stores/auth";

interface HomeRouteProps {
  /** Página inicial, para quem não entrou. */
  visitor: ReactNode;
  /** O app logado (ProtectedRoute + Layout), com o Painel em "/". */
  children: ReactNode;
}

// "/" serve dois públicos: a página inicial para visitantes e o Painel para quem entrou. Envolve a
// rota do app inteira (não só "/") para o Layout não remontar ao ir do Painel para outra página.
// A página inicial é pública e não depende da API: com a API fora, o refresh falhava (404/rede)
// e o visitante via um erro no lugar dela. Agora ela aparece na hora; a restauração da sessão
// corre por trás e, se renovar, troca para o Painel. Só quem tem sinal de sessão anterior espera
// o refresh (carregamento neutro), para não piscar a página inicial antes do Painel; se falhar,
// fica na página inicial como deslogado. Fora de "/" quem decide é o ProtectedRoute.
export function HomeRoute({ visitor, children }: HomeRouteProps) {
  const isHome = useMatch("/") !== null;
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hadSession = useHadSession();
  const { status } = useSessionBootstrap();

  if (!isHome || isAuthenticated) return <>{children}</>;
  if (status === "checking" && hadSession) return <SessionLoading />;
  return <>{visitor}</>;
}
