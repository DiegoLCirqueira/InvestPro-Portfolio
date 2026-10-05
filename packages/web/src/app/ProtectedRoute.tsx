import { useEffect, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { ErrorState } from "@/components/ErrorState";
import { SessionLoading } from "@/app/SessionLoading";
import { useHadSession, useSessionBootstrap } from "@/app/use-session-bootstrap";
import {
  classifyRequestFailure,
  SERVER_BUSY_MESSAGE,
  SERVER_UNREACHABLE_MESSAGE,
} from "@/lib/request-failure";
import { useAuthStore } from "@/stores/auth";
import type { UserRole } from "@/types/user";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserRole;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const hadSession = useHadSession();
  const { status, error, retry } = useSessionBootstrap();
  // A mensagem depende da causa: antes o texto de "muitas requisições" valia para qualquer falha
  // (inclusive a API fora do ar). 401 nunca chega aqui como "unavailable": vai para o login.
  const failure = status === "unavailable" ? classifyRequestFailure(error) : null;

  const isForbidden =
    status === "ready" &&
    isAuthenticated &&
    Boolean(requiredRole) &&
    user?.role !== requiredRole;

  useEffect(() => {
    if (isForbidden) {
      toast.error("Acesso restrito a administradores");
    }
  }, [isForbidden]);

  if (status === "checking") return <SessionLoading />;

  // Sem sinal de sessão anterior não há o que "manter": vai para o login (e volta para cá depois),
  // mesmo com a API fora. Com sessão anterior, ela pode seguir válida: oferece tentar de novo.
  if (failure && failure !== "unauthenticated" && hadSession) {
    return (
      <div className="flex-1 min-h-screen flex items-center justify-center bg-brand-bg">
        <ErrorState
          title="Não foi possível restaurar sua sessão"
          message={failure === "rate-limited" ? SERVER_BUSY_MESSAGE : SERVER_UNREACHABLE_MESSAGE}
          onRetry={retry}
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (isForbidden) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
