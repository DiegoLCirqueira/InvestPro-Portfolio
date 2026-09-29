import type { ReactNode } from "react";
import { useMatch } from "react-router-dom";
import { SessionLoading } from "@/app/SessionLoading";
import { useSessionBootstrap } from "@/app/use-session-bootstrap";
import { useAuthStore } from "@/stores/auth";

interface HomeRouteProps {
  /** Página inicial, para quem não entrou. */
  visitor: ReactNode;
  /** O app logado (ProtectedRoute + Layout), com o Painel em "/". */
  children: ReactNode;
}

// "/" serve dois públicos: a página inicial para visitantes e o Painel para quem entrou. Envolve a
// rota do app inteira (não só "/") para o Layout não remontar ao ir do Painel para outra página.
// Só decide depois de tentar restaurar a sessão; se ela não pôde ser confirmada agora (429, rede),
// segue para o app, onde o ProtectedRoute oferece "tentar de novo" em vez de tratar como visitante.
// Fora de "/" a restauração corre junto com a do ProtectedRoute, e o refresh é single-flight.
export function HomeRoute({ visitor, children }: HomeRouteProps) {
  const isHome = useMatch("/") !== null;
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { status } = useSessionBootstrap();

  if (isHome && status === "checking") return <SessionLoading />;
  if (isHome && status === "ready" && !isAuthenticated) return <>{visitor}</>;
  return <>{children}</>;
}
