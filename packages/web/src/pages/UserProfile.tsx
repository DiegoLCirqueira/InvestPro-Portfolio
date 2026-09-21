import { useState } from "react";
import type { FormEvent } from "react";
import { ChevronLeft, ShieldCheck, Wallet, X } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import type { UpdateProfileInput } from "@/hooks/use-profile";
import { usePortfolioPositions, useTopUpPortfolio } from "@/hooks/usePortfolio";
import { useCurrencyDigitsInput } from "@/hooks/use-currency-digits-input";
import { useFinancialErrorHandler } from "@/hooks/use-financial-error-handler";
import { useSubmitOnce } from "@/hooks/use-submit-once";
import { EmptyState } from "@/components/EmptyState";
import { CpfSection } from "@/components/profile/CpfSection";
import { ProfileField } from "@/components/profile/ProfileField";
import { ErrorState } from "@/components/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";

const PHONE_REGEX = /^\+?\d{10,15}$/;

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
  const amountInput = useCurrencyDigitsInput();

  const handleTopUpError = useFinancialErrorHandler();
  const topUp = useTopUpPortfolio({
    onSuccess: () => {
      toast.success("Saldo adicionado com sucesso!");
      amountInput.reset();
      void refetch();
    },
    onError: handleTopUpError,
  });

  const submitTopUp = async () => {
    if (amountInput.amount <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    try {
      await topUp.mutate(amountInput.amount);
    } catch {
      // erro já tratado via onError
    }
  };

  const handleSubmit = useSubmitOnce(submitTopUp);

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
          inputMode="numeric"
          value={amountInput.displayValue}
          onChange={amountInput.onChange}
          aria-label="Valor a adicionar"
          className="min-w-0 flex-1 px-4 py-3 rounded-xl bg-surface-1 border border-input text-foreground text-sm tabular-nums focus:outline-none focus:border-brand-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors duration-200"
        />
        <button
          type="submit"
          disabled={topUp.isPending}
          className="min-h-11 shrink-0 px-4 rounded-xl bg-primary-solid hover:opacity-90 disabled:opacity-50 transition-opacity duration-200 text-primary-foreground font-bold text-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {topUp.isPending ? "Adicionando..." : "Adicionar saldo"}
        </button>
      </form>
    </div>
  );
}

export function UserProfile() {
  const navigate = useNavigate();
  const shouldFocusCpf = useLocation().hash === "#cpf";
  const authUser = useAuthStore((s) => s.user);
  const setAuthUser = useAuthStore((s) => s.setUser);
  const isAdmin = authUser?.role === "ADMIN";

  const { data: profile, error, isLoading, refetch } = useProfile();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  // Copia o perfil carregado para o formulário (uma vez por versão do perfil).
  const [syncedProfile, setSyncedProfile] = useState(profile);
  if (profile && profile !== syncedProfile) {
    setSyncedProfile(profile);
    setFullName(profile.fullName);
    setPhone(profile.phone ?? "");
  }

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
        <ProfileField label="Nome Completo" value={fullName} onChange={setFullName} editable />
        <ProfileField label="Email" value={profile.email} />
        <ProfileField
          label="Telefone"
          value={phone}
          onChange={setPhone}
          editable
          placeholder="+5511999999999"
        />

        <button
          type="submit"
          disabled={updateProfile.isPending}
          className="min-h-11 w-full py-3 rounded-xl bg-primary-solid hover:opacity-90 disabled:opacity-50 transition-opacity duration-200 text-primary-foreground font-bold text-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {updateProfile.isPending ? "Salvando..." : "Salvar alterações"}
        </button>
      </form>

      <div className="mt-6">
        <CpfSection savedCpf={profile.cpf} onAlreadySet={refetch} shouldFocus={shouldFocusCpf} />
      </div>

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
      <div className="flex-1 flex nav:items-start nav:justify-center min-h-0 overflow-y-auto custom-scrollbar">
        {/* Mobile: página cheia, sem moldura. Desktop (nav): card centralizado. */}
        <div className="w-full flex flex-col nav:max-w-xl nav:rounded-2xl nav:border nav:border-border nav:bg-surface-1 nav:p-8 nav:shadow-2xl">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="nav:hidden flex items-center gap-1 min-h-11 -ml-2 px-2 mb-4 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors self-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ChevronLeft size={20} />
            Voltar
          </button>

          <div className="flex items-center justify-between mb-6 nav:mb-8">
            <h2 className="text-2xl font-bold text-foreground">Perfil do Usuário</h2>
            <button
              onClick={() => navigate("/")}
              className="hidden nav:block p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
