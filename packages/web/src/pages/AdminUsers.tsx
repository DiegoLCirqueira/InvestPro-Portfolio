import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { Loader2, ShieldAlert, Users } from "lucide-react";
import { toast } from "sonner";
import { useAdminUsers } from "@/hooks/use-admin-users";
import { ApiError } from "@/services/api";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  USER: "Usuário",
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("pt-BR");
}

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
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
        <ShieldAlert size={40} className="text-red-500" />
        <h2 className="text-xl font-bold text-white">
          Não foi possível carregar os usuários
        </h2>
        <p className="text-sm text-gray-400 text-center max-w-md">
          {error.message}
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 rounded-xl bg-brand-primary text-black text-sm font-bold hover:opacity-90 transition-opacity"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const users = data ?? [];

  return (
    <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-500">
      <header className="mb-6 shrink-0">
        <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
          <Users size={22} className="text-brand-primary" />
          Administração de Usuários
        </h2>
        <p className="text-gray-400 text-sm">
          Lista de todos os usuários cadastrados no sistema.
        </p>
      </header>

      {users.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-16">
          Nenhum usuário encontrado.
        </p>
      ) : (
        <div className="rounded-2xl border border-gray-800 bg-[#161b22] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-xs text-gray-500 uppercase tracking-wider">
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
                  className="border-b border-gray-800/50 last:border-0"
                >
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {user.id}
                  </td>
                  <td className="px-4 py-3 text-white">{user.email}</td>
                  <td className="px-4 py-3 text-white">{user.fullName}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-tighter ${
                        user.role === "ADMIN"
                          ? "bg-brand-primary/15 text-brand-primary"
                          : "bg-gray-700/30 text-gray-400"
                      }`}
                    >
                      {ROLE_LABEL[user.role] ?? user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400" title={user.createdAt}>
                    {formatDate(user.createdAt)}
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
