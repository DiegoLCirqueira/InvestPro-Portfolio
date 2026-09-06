import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ChevronLeft, Moon, ShieldCheck, Sun, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import type { UpdateProfileInput } from "@/hooks/use-profile";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";

const THEME_KEY = "investpro-theme";
const PHONE_REGEX = /^\+?\d{10,15}$/;

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
  onChange?: (value: string) => void;
  editable?: boolean;
  muted?: boolean;
  placeholder?: string;
}

function Field({ label, value, onChange, editable = false, muted = false, placeholder }: FieldProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-muted-foreground">
        {label}
      </label>
      <input
        value={value}
        placeholder={placeholder}
        onChange={editable && onChange ? (e) => onChange(e.target.value) : undefined}
        disabled={!editable}
        className={`w-full px-4 py-3 rounded-xl bg-surface-2 border border-input text-foreground text-sm transition-colors duration-200 ${
          editable
            ? "focus:outline-none focus:border-brand-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            : "focus:outline-none"
        } ${muted ? "opacity-40" : ""}`}
      />
    </div>
  );
}

function ProfileFieldsSkeleton() {
  return (
    <div className="space-y-5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      ))}
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
        className={`relative min-h-11 min-w-16 w-16 h-8 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
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
  const setAuthUser = useAuthStore((s) => s.setUser);
  const isAdmin = authUser?.role === "ADMIN";
  const { isDark, toggle } = useThemeToggle();

  const { data: profile, error, isLoading, refetch } = useProfile();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName);
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  const updateProfile = useUpdateProfile({
    onSuccess: (updated) => {
      toast.success("Perfil atualizado com sucesso!");
      setFullName(updated.fullName);
      setPhone(updated.phone ?? "");
      if (authUser) {
        setAuthUser({ ...authUser, fullName: updated.fullName });
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile) return;

    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();

    if (trimmedName.length < 2) {
      toast.error("Nome deve ter pelo menos 2 caracteres.");
      return;
    }
    if (trimmedPhone && !PHONE_REGEX.test(trimmedPhone)) {
      toast.error("Telefone inválido. Use apenas números (10 a 15 dígitos), com +DDI opcional.");
      return;
    }

    const payload: UpdateProfileInput = {};
    if (trimmedName !== profile.fullName) payload.fullName = trimmedName;
    if (trimmedPhone && trimmedPhone !== (profile.phone ?? "")) payload.phone = trimmedPhone;

    if (Object.keys(payload).length === 0) {
      toast("Nenhuma alteração para salvar.");
      return;
    }

    try {
      await updateProfile.mutate(payload);
    } catch {
      // erro já tratado via onError
    }
  };

  const body = isLoading ? (
    <ProfileFieldsSkeleton />
  ) : error ? (
    <ErrorState
      message={error.message}
      onRetry={() => refetch()}
      bordered={false}
      className="py-8"
    />
  ) : !profile ? (
    <EmptyState message="Nenhum dado de perfil disponível." />
  ) : (
    <>
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Nome Completo" value={fullName} onChange={setFullName} editable />
        <Field label="Email" value={profile.email} />
        <Field
          label="Telefone"
          value={phone}
          onChange={setPhone}
          editable
          placeholder="+5511999999999"
        />
        <Field label="CPF" value={profile.cpf ?? "Não informado"} muted />

        <button
          type="submit"
          disabled={updateProfile.isPending}
          className="min-h-11 w-full py-3 rounded-xl bg-brand-primary hover:opacity-90 disabled:opacity-50 transition-opacity duration-200 text-white font-bold text-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {updateProfile.isPending ? "Salvando..." : "Salvar alterações"}
        </button>
      </form>

      <div className="mt-6 space-y-3">
        <ThemeToggleRow isDark={isDark} onToggle={toggle} />

        {isAdmin && (
          <Link
            to="/admin/users"
            className="flex min-h-11 items-center gap-3 p-4 rounded-xl border border-border bg-surface-2 text-foreground hover:border-primary/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
          className="flex items-center gap-1 min-h-11 -ml-2 px-2 mb-4 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors self-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ChevronLeft size={20} />
          Voltar
        </button>
        <h2 className="text-2xl font-bold text-foreground mb-6">Perfil do Usuário</h2>
        {body}
      </div>

      {/* A partir de nav: card centralizado */}
      <div className="hidden nav:flex flex-1 items-start justify-center min-h-0 overflow-y-auto custom-scrollbar">
        <div className="w-full max-w-xl rounded-2xl border border-border bg-surface-1 p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-foreground">Perfil do Usuário</h2>
            <button
              onClick={() => navigate("/")}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label="Fechar"
              type="button"
            >
              <X size={18} />
            </button>
          </div>
          {body}
        </div>
      </div>
    </div>
  );
}
