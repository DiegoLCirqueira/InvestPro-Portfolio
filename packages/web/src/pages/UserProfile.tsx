import { useEffect, useState } from "react";
import { ChevronLeft, Moon, ShieldCheck, Sun, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";

const THEME_KEY = "investpro-theme";

function useThemeToggle() {
  const [isDark, setIsDark] = useState(
    () => document.documentElement.getAttribute("data-theme") === "dark",
  );

  useEffect(() => {
    if (isDark) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  }, [isDark]);

  return { isDark, toggle: () => setIsDark((v) => !v) };
}

interface FieldProps {
  label: string;
  value: string;
  disabledTone?: boolean;
}

function Field({ label, value, disabledTone = false }: FieldProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-muted-foreground">
        {label}
      </label>
      <input
        value={value}
        disabled
        className={`w-full px-4 py-3 rounded-xl bg-surface-2 border border-input text-foreground text-sm focus:outline-none ${
          disabledTone ? "opacity-40" : ""
        }`}
      />
    </div>
  );
}

function ThemeToggleRow({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-surface-2">
      <div className="flex items-center gap-3">
        {isDark ? (
          <Moon size={18} className="text-primary" />
        ) : (
          <Sun size={18} className="text-primary" />
        )}
        <span className="text-sm font-medium text-foreground">
          Tema {isDark ? "escuro" : "claro"}
        </span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label="Alternar tema claro/escuro"
        onClick={onToggle}
        className={`relative min-h-11 min-w-16 w-16 h-8 rounded-full transition-colors ${
          isDark ? "bg-primary" : "bg-border"
        }`}
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
            isDark ? "translate-x-9" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

export function UserProfile() {
  const navigate = useNavigate();
  const authUser = useAuthStore((s) => s.user);
  const isAdmin = authUser?.role === "ADMIN";
  const { isDark, toggle } = useThemeToggle();

  const user = {
    fullName: authUser?.fullName ?? "João Silva Santos",
    email: authUser?.email ?? "joao.silva@email.com",
    phone: "(11) 99999-9999",
    address: "Rua das Flores, 123 - São Paulo, SP",
    cpf: "123.456.789-00",
  };

  const content = (
    <>
      <div className="space-y-5">
        <Field label="Nome Completo" value={user.fullName} />
        <Field label="Email" value={user.email} />
        <Field label="Telefone" value={user.phone} />
        <Field label="Endereço" value={user.address} />
        <Field label="CPF" value={user.cpf} disabledTone />
      </div>

      <div className="mt-6 space-y-3">
        <ThemeToggleRow isDark={isDark} onToggle={toggle} />

        {isAdmin && (
          <Link
            to="/admin/users"
            className="flex min-h-11 items-center gap-3 p-4 rounded-xl border border-border bg-surface-2 text-foreground hover:border-primary/50 transition-colors"
          >
            <ShieldCheck size={18} className="text-primary" />
            <span className="text-sm font-medium">Administração</span>
          </Link>
        )}
      </div>
    </>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-500 overflow-hidden">
      {/* Abaixo de nav: página cheia, sem moldura de card, navegação padrão de voltar */}
      <div className="nav:hidden flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 min-h-11 -ml-2 px-2 mb-4 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors self-start"
        >
          <ChevronLeft size={20} />
          Voltar
        </button>
        <h2 className="text-2xl font-bold text-foreground mb-6">Perfil do Usuário</h2>
        {content}
      </div>

      {/* A partir de nav: card centralizado */}
      <div className="hidden nav:flex flex-1 items-start justify-center min-h-0">
        <div className="w-full max-w-xl rounded-2xl border border-border bg-surface-1 p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-foreground">Perfil do Usuário</h2>
            <button
              onClick={() => navigate("/")}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label="Fechar"
              type="button"
            >
              <X size={18} />
            </button>
          </div>
          {content}
        </div>
      </div>
    </div>
  );
}
