import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import type { UpdateProfileInput } from "@/hooks/use-profile";
import {
  usePortfolioPositions,
  useTopUpLimit,
  useTopUpPortfolio,
} from "@/hooks/usePortfolio";
import {
  INVESTOR_PROFILE_LABELS,
  useInvestorProfile,
} from "@/hooks/use-investor-profile";
import { useCurrencyDigitsInput } from "@/hooks/use-currency-digits-input";
import { useFinancialErrorHandler } from "@/hooks/use-financial-error-handler";
import { useSubmitOnce } from "@/hooks/use-submit-once";
import { EmptyState } from "@/components/EmptyState";
import { CpfSection } from "@/components/profile/CpfSection";
import { ProfileField } from "@/components/profile/ProfileField";
import { ErrorState } from "@/components/ErrorState";
import { fieldInputClassName } from "@/components/FormField";
import { PageHeader } from "@/components/PageHeader";
import { SectionTitle } from "@/components/SectionTitle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

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
  const topUpLimit = useTopUpLimit();
  const amountInput = useCurrencyDigitsInput();
  const remaining = topUpLimit.data?.remaining;
  const isLimitReached = remaining === 0;

  const handleTopUpError = useFinancialErrorHandler();
  const topUp = useTopUpPortfolio({
    onSuccess: () => {
      toast.success("Saldo adicionado com sucesso!");
      amountInput.reset();
      void refetch();
      void topUpLimit.refetch();
    },
    onError: handleTopUpError,
  });

  const submitTopUp = async () => {
    if (amountInput.amount <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    if (remaining !== undefined && amountInput.amount > remaining) {
      toast.error(
        `Você ainda pode adicionar até ${formatCurrency(remaining)}.`,
      );
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
    <ProfileSection
      title="Simular depósito"
      description="Funcionalidade de demonstração — não representa um pagamento real."
    >
      <p className="text-xs text-muted-foreground">
        Saldo atual:{" "}
        <span className="font-semibold text-foreground">
          {isLoading ? "..." : formatCurrency(balance)}
        </span>
      </p>

      {topUpLimit.data && (
        <p className="text-xs text-muted-foreground">
          {isLimitReached ? (
            "Você já adicionou o limite de saldo da conta. Agora o saldo só cresce com seus investimentos."
          ) : (
            <>
              Ainda pode adicionar{" "}
              <span className="font-semibold text-foreground tabular-nums">
                {formatCurrency(topUpLimit.data.remaining)}
              </span>{" "}
              de {formatCurrency(topUpLimit.data.limit)} no total.
            </>
          )}
        </p>
      )}

      {/* Mesmo estilo de campo das outras páginas (antes era branco sobre cinza, o inverso). */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          value={amountInput.displayValue}
          onChange={amountInput.onChange}
          onPaste={amountInput.onPaste}
          aria-label="Valor a adicionar"
          disabled={isLimitReached}
          className={cn(fieldInputClassName, "min-w-0 flex-1 tabular-nums")}
        />
        <Button
          type="submit"
          variant="outline"
          className="h-auto min-h-11 shrink-0"
          disabled={topUp.isPending || isLimitReached}
        >
          {topUp.isPending ? "Adicionando..." : "Adicionar saldo"}
        </Button>
      </form>
    </ProfileSection>
  );
}

// Atalho para o questionário: mostra o perfil atual ou convida a descobrir.
function InvestorProfileSection() {
  const { data } = useInvestorProfile();
  const profile = data?.profile;

  return (
    <ProfileSection
      title="Perfil de investidor"
      description={
        profile
          ? `Seu perfil: ${INVESTOR_PROFILE_LABELS[profile.type]}.`
          : "Descubra seu perfil em 7 perguntas."
      }
    >
      <div className="flex justify-end">
        <Button asChild variant="outline" className="min-h-11">
          <Link to="/profile/investor-profile">
            {profile ? "Ver ou refazer" : "Descobrir meu perfil"}
            <ChevronRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </ProfileSection>
  );
}

// Uma seção por assunto, cada uma com o seu próprio botão de salvar: com 3 formulários
// independentes na página, o botão fica visualmente preso ao que ele salva.
function ProfileSection({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const titleId = `${id ?? title.toLowerCase().replace(/\W+/g, "-")}-title`;
  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-1 p-4 sm:p-6"
    >
      <div className="space-y-1">
        <SectionTitle id={titleId}>{title}</SectionTitle>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
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
  // Erros de validação ficam abaixo de cada campo (todos de uma vez), não em toasts um por vez.
  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string;
    phone?: string;
  }>({});
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

    const errors = {
      fullName:
        trimmedName.length < 2
          ? "Nome deve ter pelo menos 2 caracteres."
          : undefined,
      phone:
        trimmedPhone && !PHONE_REGEX.test(trimmedPhone)
          ? "Telefone inválido. Use apenas números (10 a 15 dígitos), com +DDI opcional."
          : undefined,
    };
    setFieldErrors(errors);
    if (errors.fullName || errors.phone) return;

    const payload: UpdateProfileInput = {};
    if (trimmedName !== profile.fullName) payload.fullName = trimmedName;
    if (trimmedPhone && trimmedPhone !== (profile.phone ?? ""))
      payload.phone = trimmedPhone;

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

  const personalData = isLoading ? (
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <ProfileField
        label="Nome Completo"
        value={fullName}
        onChange={setFullName}
        editable
        error={fieldErrors.fullName}
      />
      <ProfileField label="Email" value={profile.email} />
      <ProfileField
        label="Telefone"
        value={phone}
        onChange={setPhone}
        editable
        placeholder="+5511999999999"
        error={fieldErrors.phone}
      />

      {/* A única ação principal da página (verde cheio); as outras seções usam outline. */}
      <Button
        type="submit"
        className="h-auto min-h-11 self-end"
        disabled={updateProfile.isPending}
      >
        {updateProfile.isPending ? "Salvando..." : "Salvar alterações"}
      </Button>
    </form>
  );

  // Página comum (PageHeader + seções em cards), não mais um card centralizado com "×" que
  // parecia um diálogo. No celular o "Voltar" continua sendo o caminho de volta.
  return (
    <div className="flex flex-col animate-in fade-in duration-500">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="nav:hidden flex items-center gap-1 min-h-11 -ml-2 px-2 mb-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors self-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <ChevronLeft size={20} />
        Voltar
      </button>

      <PageHeader
        title="Perfil"
        description="Seus dados, CPF, perfil de investidor e saldo de demonstração."
      />

      <div className="flex w-full max-w-2xl flex-col gap-6">
        <ProfileSection title="Dados pessoais">{personalData}</ProfileSection>

        {profile && (
          <>
            {/* id="cpf": destino do "Completar CPF" de Transferências (/profile#cpf). */}
            <ProfileSection id="cpf" title="Documento">
              <CpfSection
                savedCpf={profile.cpf}
                onAlreadySet={refetch}
                shouldFocus={shouldFocusCpf}
              />
            </ProfileSection>

            <InvestorProfileSection />
            <TopUpCard />

            {isAdmin && (
              <ProfileSection
                title="Administração"
                description="Lista de todos os usuários cadastrados."
              >
                <div className="flex justify-end">
                  <Button asChild variant="outline" className="min-h-11">
                    <Link to="/admin/users">
                      <ShieldCheck aria-hidden="true" />
                      Abrir administração
                    </Link>
                  </Button>
                </div>
              </ProfileSection>
            )}
          </>
        )}
      </div>
    </div>
  );
}
