import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { Loader2, ShieldAlert, Users, UserX } from "lucide-react";
import { toast } from "sonner";
import { useAdminUsers } from "@/hooks/use-admin-users";
import { ApiError } from "@/services/api";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { formatDateTime } from "@/lib/format";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  USER: "Usuário",
};

export function AdminUsers() {
  const { data, error, isLoading, refetch } = useAdminUsers();

  const isForbidden = error instanceof ApiError && error.status === 403;

  useEffect(() => {
    if (isForbidden) {
      toast.error("Acesso restrito a administradores");
    }
  }, [isForbidden]);

  if (isForbidden) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 size={32} className="text-brand-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        icon={ShieldAlert}
        title="Não foi possível carregar os usuários"
        message={error.message}
        onRetry={() => refetch()}
      />
    );
  }

  const users = data ?? [];

  return (
    <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-500">
      <header className="mb-6 shrink-0">
        <h2 className="text-2xl font-bold text-foreground mb-1 flex items-center gap-2">
          <Users size={22} className="text-brand-primary" />
          Administração de Usuários
        </h2>
        <p className="text-muted-foreground text-sm">
          Lista de todos os usuários cadastrados no sistema.
        </p>
      </header>

      {users.length === 0 ? (
        <EmptyState icon={UserX} message="Nenhum usuário encontrado." />
      ) : (
        <div className="rounded-2xl border border-border bg-surface-1 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3 font-bold">ID</th>
                <th className="px-4 py-3 font-bold">Email</th>
                <th className="px-4 py-3 font-bold">Nome</th>
                <th className="px-4 py-3 font-bold">Role</th>
                <th className="px-4 py-3 font-bold">Criado em</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-border/50 last:border-0"
                >
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {user.id}
                  </td>
                  <td className="px-4 py-3 text-foreground">{user.email}</td>
                  <td className="px-4 py-3 text-foreground">{user.fullName}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-tighter ${
                        user.role === "ADMIN"
                          ? "bg-brand-primary/15 text-brand-primary"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {ROLE_LABEL[user.role] ?? user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground" title={user.createdAt}>
                    {formatDateTime(user.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
