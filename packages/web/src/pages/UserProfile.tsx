import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import type { UpdateProfileInput } from "@/hooks/use-profile";
import {
  INVESTOR_PROFILE_LABELS,
  useInvestorProfile,
} from "@/hooks/use-investor-profile";
import { EmptyState } from "@/components/EmptyState";
import { CpfSection } from "@/components/profile/CpfSection";
import { TopUpForm } from "@/components/profile/TopUpForm";
import { ProfileField } from "@/components/profile/ProfileField";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/PageHeader";
import { SectionTitle } from "@/components/SectionTitle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { cardClassName } from "@/components/ui/card";
import { formatMonthYear } from "@/lib/format";

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

// Carregando: reserva o lugar dos cards de Perfil de investidor e Simular depósito.
function SideCardsSkeleton() {
  return (
    <>
      {[0, 1].map((card) => (
        <div key={card} className={cn(cardClassName, "space-y-4")}>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56 max-w-full" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      ))}
    </>
  );
}

function TopUpCard() {
  return (
    <ProfileSection
      title="Simular depósito"
      description="Funcionalidade de demonstração — não representa um pagamento real."
    >
      <TopUpForm submitVariant="outline" />
    </ProfileSection>
  );
}

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
        <Button asChild variant="outline" className="w-full sm:w-auto">
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
  className,
}: {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  const titleId = `${id ?? title.toLowerCase().replace(/\W+/g, "-")}-title`;
  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className={cn(cardClassName, "flex flex-col gap-4", className)}
    >
      <div className="space-y-1">
        <SectionTitle id={titleId}>{title}</SectionTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
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
      {/* Nome na largura toda; Email e Telefone (campos curtos) lado a lado a partir de sm. */}
      <div className="grid gap-5 sm:grid-cols-2 sm:gap-4">
        <ProfileField label="Email" value={profile.email} />
        <ProfileField
          label="Telefone"
          value={phone}
          onChange={setPhone}
          editable
          placeholder="+5511999999999"
          error={fieldErrors.phone}
        />
      </div>

      {/* A única ação principal da página (verde cheio); as outras seções usam outline. Largura
          total no celular; à direita, com largura do texto, a partir de sm. */}
      <Button
        type="submit"
        className="w-full sm:w-auto sm:self-end"
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

      {/* Um resumo só com o que já existe (sem card novo, que repetiria Dados pessoais). */}
      <PageHeader
        title="Perfil"
        description={
          profile?.createdAt ? `Membro desde ${formatMonthYear(profile.createdAt)}.` : undefined
        }
      />

      {/* Duas colunas de cards em pares (Dados pessoais | Documento, Perfil de investidor |
          Simular depósito): cada linha tem a altura do maior card, então os pares ficam alinhados,
          em vez de duas pilhas de alturas diferentes. A ordem do DOM já é a do celular. */}
      <div className="grid grid-cols-1 nav:grid-cols-2 gap-4">
        <ProfileSection title="Dados pessoais">{personalData}</ProfileSection>

        {profile && (
          /* id="cpf": destino do "Completar CPF" de Transferências (/profile#cpf). */
          <ProfileSection id="cpf" title="Documento">
            <CpfSection
              savedCpf={profile.cpf}
              onAlreadySet={refetch}
              shouldFocus={shouldFocusCpf}
            />
          </ProfileSection>
        )}

        {isLoading && <SideCardsSkeleton />}
        {profile && (
          <>
            <InvestorProfileSection />
            <TopUpCard />

            {isAdmin && (
              <ProfileSection
                title="Administração"
                description="Lista de todos os usuários cadastrados."
                className="nav:col-span-2"
              >
                <div className="flex justify-end">
                  <Button asChild variant="outline">
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
