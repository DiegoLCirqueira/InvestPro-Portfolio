import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { SectionTitle } from "@/components/SectionTitle";
import { StatusBadge, type StatusTone } from "@/components/StatusBadge";
import { ErrorState } from "@/components/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { AllocationBars } from "@/components/investor-profile/AllocationBars";
import { INVESTOR_PROFILE_LABELS, useRecommendations } from "@/hooks/use-investor-profile";
import type { PersonalizedRecommendation, RecommendationCategory } from "@/types/investor-profile";

const CATEGORY_BADGES: Record<RecommendationCategory, { label: string; tone: StatusTone }> = {
  PROFILE: { label: "Perfil", tone: "info" },
  DIVERSIFICATION: { label: "Diversificação", tone: "purple" },
  OPPORTUNITY: { label: "Oportunidade", tone: "success" },
  RISK: { label: "Risco", tone: "danger" },
  ALIGNED: { label: "Em dia", tone: "success" },
};

const PROFILE_LINK_CLASS =
  "min-h-11 inline-flex items-center gap-2 rounded-xl text-sm font-semibold text-brand-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

// Sugestões do servidor: comparam a carteira com a carteira de referência do
// perfil de investidor. Conteúdo educativo, não recomendação de investimento.
export function Recommendations() {
  const { data, error, isLoading, refetch } = useRecommendations();

  return (
    <div className="flex flex-col animate-in fade-in duration-500">
      <PageHeader
        title="Recomendações"
        description={
          <span role="note">
            Sugestões educativas geradas por regras, a partir do seu perfil de investidor e da sua
            carteira. Não são uma recomendação de investimento.
          </span>
        }
      />

      {isLoading ? (
        <RecommendationsSkeleton />
      ) : error || !data ? (
        <ErrorState message="Não foi possível carregar as recomendações." onRetry={() => void refetch()} />
      ) : (
        <div className="grid gap-6 nav:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] nav:items-start">
          <section aria-label="Sugestões" className="space-y-4">
            {data.items.map((item) => (
              <RecommendationCard key={item.id} item={item} />
            ))}
          </section>

          {data.profile && (
            <aside className="space-y-5 rounded-2xl border border-border bg-surface-1 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Seu perfil</p>
                  <p className="text-xl font-bold text-foreground">{INVESTOR_PROFILE_LABELS[data.profile]}</p>
                </div>
                <Compass size={20} className="text-brand-primary" aria-hidden="true" />
              </div>
              <div className="space-y-3">
                <SectionTitle>Sua carteira x referência</SectionTitle>
                <AllocationBars rows={data.allocation} />
                <p className="text-xs text-muted-foreground">
                  A barra mostra quanto você tem hoje em cada classe (sobre o total investido); o traço
                  marca a referência do seu perfil.
                </p>
              </div>
              <Link to="/profile/investor-profile" className={PROFILE_LINK_CLASS}>
                Ver ou refazer meu perfil
              </Link>
            </aside>
          )}
        </div>
      )}
    </div>
  );
}

function RecommendationCard({ item }: { item: PersonalizedRecommendation }) {
  const badge = CATEGORY_BADGES[item.category];
  return (
    <article className="rounded-2xl border border-border bg-surface-1 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <SectionTitle className="mb-2">{item.title}</SectionTitle>
          <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
        </div>
        <StatusBadge label={badge.label} tone={badge.tone} uniformWidth />
      </div>
      {item.category === "PROFILE" && (
        <Link
          to="/profile/investor-profile"
          className="mt-4 min-h-11 inline-flex items-center gap-2 rounded-xl bg-primary-solid px-4 text-sm font-bold text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Compass size={16} aria-hidden="true" />
          Responder o questionário
        </Link>
      )}
    </article>
  );
}

function RecommendationsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full rounded-2xl" />
      ))}
    </div>
  );
}
