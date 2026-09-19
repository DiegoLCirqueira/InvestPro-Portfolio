import { useEffect, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ErrorState } from "@/components/ErrorState";
import { useSessionBootstrap } from "@/app/use-session-bootstrap";
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
  const { status, retry } = useSessionBootstrap();

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

  if (status === "checking") {
    return (
      <div className="flex-1 min-h-screen flex items-center justify-center bg-brand-bg">
        <Loader2 size={32} className="text-brand-primary animate-spin" />
      </div>
    );
  }

  if (status === "unavailable") {
    return (
      <div className="flex-1 min-h-screen flex items-center justify-center bg-brand-bg">
        <ErrorState
          title="Não foi possível restaurar sua sessão"
          message="O servidor está recebendo muitas requisições no momento. Sua sessão foi mantida; tente novamente."
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
