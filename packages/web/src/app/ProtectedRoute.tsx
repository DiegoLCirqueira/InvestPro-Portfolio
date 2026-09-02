import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth";
import type { UserRole } from "@/types/user";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserRole;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const token = useAuthStore((s) => s.token);
  const refresh = useAuthStore((s) => s.refresh);
  const user = useAuthStore((s) => s.user);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      // Se há token persistido mas a sessão não está validada, tenta renovar
      if (token && !isAuthenticated) {
        const ok = await refresh();
        if (!cancelled && !ok) {
          setIsChecking(false);
        }
        return;
      }
      if (!cancelled) {
        setIsChecking(false);
      }
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [token, isAuthenticated, refresh]);

  const isForbidden =
    !isChecking &&
    isAuthenticated &&
    Boolean(requiredRole) &&
    user?.role !== requiredRole;

  useEffect(() => {
    if (isForbidden) {
      toast.error("Acesso restrito a administradores");
    }
  }, [isForbidden]);

  if (isChecking) {
    return (
      <div className="flex-1 min-h-screen flex items-center justify-center bg-brand-bg">
        <Loader2 size={32} className="text-brand-primary animate-spin" />
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
