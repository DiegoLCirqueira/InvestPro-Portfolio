import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ChevronLeft, ShieldCheck, Wallet, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import type { UpdateProfileInput } from "@/hooks/use-profile";
import { usePortfolioPositions, useTopUpPortfolio } from "@/hooks/usePortfolio";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";

const PHONE_REGEX = /^\+?\d{10,15}$/;

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

function TopUpCard() {
  const { balance, isLoading, refetch } = usePortfolioPositions();
  const [amount, setAmount] = useState("");

  const topUp = useTopUpPortfolio({
    onSuccess: () => {
      toast.success("Saldo adicionado com sucesso!");
      setAmount("");
      void refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleAmountChange = (value: string) => {
    const cleaned = value.replace(",", ".");
    if (cleaned === "" || /^\d*\.?\d*$/.test(cleaned)) {
      setAmount(cleaned);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    try {
      await topUp.mutate(value);
    } catch {
      // erro já tratado via onError
    }
  };

  return (
    <div className="p-4 rounded-xl border border-border bg-surface-2 space-y-3">
      <div className="flex items-center gap-3">
        <Wallet size={18} className="text-primary" />
        <div>
          <p className="text-sm font-medium text-foreground">Simular Depósito</p>
          <p className="text-xs text-muted-foreground">
            Funcionalidade de demonstração — não representa um pagamento real.
          </p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Saldo atual:{" "}
        <span className="font-semibold text-foreground">
          {isLoading ? "..." : formatCurrency(balance)}
        </span>
      </p>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => handleAmountChange(e.target.value)}
          placeholder="0.00"
          className="min-w-0 flex-1 px-4 py-3 rounded-xl bg-surface-1 border border-input text-foreground placeholder-muted-foreground text-sm tabular-nums focus:outline-none focus:border-brand-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors duration-200"
        />
        <button
          type="submit"
          disabled={topUp.isPending}
          className="min-h-11 shrink-0 px-4 rounded-xl bg-brand-primary hover:opacity-90 disabled:opacity-50 transition-opacity duration-200 text-white font-bold text-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {topUp.isPending ? "Adicionando..." : "Adicionar saldo"}
        </button>
      </form>
    </div>
  );
}

export function UserProfile() {
  const navigate = useNavigate();
  const authUser = useAuthStore((s) => s.user);
  const setAuthUser = useAuthStore((s) => s.setUser);
  const isAdmin = authUser?.role === "ADMIN";

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
        <TopUpCard />

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
