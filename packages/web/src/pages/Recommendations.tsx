import { Link } from "react-router-dom";
import { ArrowRight, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { SectionTitle } from "@/components/SectionTitle";
import { StatusBadge, type StatusTone } from "@/components/StatusBadge";
import { ErrorState } from "@/components/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { AllocationBars } from "@/components/investor-profile/AllocationBars";
import { INVESTOR_PROFILE_LABELS, useRecommendations } from "@/hooks/use-investor-profile";
import type { PersonalizedRecommendation, RecommendationCategory } from "@/types/investor-profile";
import { cardClassName } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
            <aside className={cn(cardClassName, "space-y-5")}>
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

// Próxima ação de cada sugestão, pelo id estável que o servidor gera
// (recommendations.domain.ts): antes nenhuma levava a lugar nenhum.
const MARKET_TYPES = new Set(["STOCK", "CRYPTO", "FIXED_INCOME"]);

function recommendationAction(item: PersonalizedRecommendation): { label: string; to: string } | null {
  if (item.id === "idle-cash") return { label: "Depositar na caixinha", to: "/orders#caixinha" };
  if (item.id === "start-investing") return { label: "Ver ativos disponíveis", to: "/market" };
  const [direction, type] = item.id.split("-");
  if (direction === "increase" && type === "FOREIGN_CURRENCY") return { label: "Ir para o Câmbio", to: "/exchange" };
  if (direction === "increase" && MARKET_TYPES.has(type)) {
    return { label: "Ver ativos no Mercado", to: `/market?tipo=${type}` };
  }
  if (direction === "reduce") return { label: "Ir para Ordens", to: "/orders" };
  return null;
}

function RecommendationCard({ item }: { item: PersonalizedRecommendation }) {
  const badge = CATEGORY_BADGES[item.category];
  const action = recommendationAction(item);
  return (
    <article className={cardClassName}>
      {/* Celular: selo acima do título (numa coluna à direita ele espremia o texto em ~5
          palavras por linha); a partir de sm, à direita. */}
      <div className="flex flex-col-reverse items-start gap-2 sm:flex-row sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <SectionTitle className="mb-2">{item.title}</SectionTitle>
          <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
        </div>
        <StatusBadge label={badge.label} tone={badge.tone} uniformWidth />
      </div>
      {action && (
        <Button asChild variant="link" className="mt-2 px-0">
          <Link to={action.to}>
            {action.label}
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      )}
      {item.category === "PROFILE" && (
        <Button asChild className="mt-4">
          <Link to="/profile/investor-profile">
            <Compass aria-hidden="true" />
            Responder o questionário
          </Link>
        </Button>
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
