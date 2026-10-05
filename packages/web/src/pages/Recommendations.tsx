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
import { CATEGORY_LABELS } from "@/lib/allocation";
import { SAVINGS_BOX_PATH } from "@/lib/savings-box";
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
        // "Seu perfil" no topo, em largura total, e as sugestões em duas colunas: cada linha tem a
        // altura do maior card, em vez de uma pilha estreita ao lado de um painel de outra altura.
        <div className="flex flex-col gap-6">
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
                <AllocationBars
                  rows={data.allocation.map((row) => ({
                    ...row,
                    label: CATEGORY_LABELS[row.type] ?? row.label,
                  }))}
                />
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

          {/* Com número ímpar de sugestões, a última ocupa a linha toda (sem meia linha vazia). */}
          <section
            aria-label="Sugestões"
            className="grid gap-4 nav:grid-cols-2 nav:[&>*:last-child:nth-child(odd)]:col-span-2"
          >
            {data.items.map((item) => (
              <RecommendationCard key={item.id} item={item} />
            ))}
          </section>
        </div>
      )}
    </div>
  );
}

// Próxima ação de cada sugestão, pelo id estável que o servidor gera
// (recommendations.domain.ts): antes nenhuma levava a lugar nenhum.
const MARKET_TYPES = new Set(["STOCK", "CRYPTO", "FIXED_INCOME"]);

function recommendationAction(item: PersonalizedRecommendation): { label: string; to: string } | null {
  if (item.id === "idle-cash") return { label: "Depositar na Caixinha", to: SAVINGS_BOX_PATH };
  if (item.id === "start-investing") return { label: "Ver ativos disponíveis", to: "/market" };
  const [direction, type] = item.id.split("-");
  // Moeda estrangeira se compra e se vende no Câmbio (não em Ordens), para aumentar ou reduzir.
  if (type === "FOREIGN_CURRENCY") return { label: "Ir para o Câmbio", to: "/exchange" };
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
    <article className={cn(cardClassName, "flex flex-col")}>
      {/* Selo ao lado do título (também no celular) e descrição em largura total embaixo: antes,
          numa coluna à direita de título + descrição, o selo espremia o texto em ~5 palavras. */}
      <div className="flex items-start justify-between gap-3">
        <SectionTitle className="min-w-0 flex-1">{item.title}</SectionTitle>
        <span className="shrink-0">
          <StatusBadge label={badge.label} tone={badge.tone} />
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
      {action && (
        // mt-auto: a ação fica no pé do card, alinhada entre os cards da mesma linha.
        <Button asChild variant="link" className="mt-auto self-start px-0 pt-2">
          <Link to={action.to}>
            {action.label}
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      )}
      {item.category === "PROFILE" && (
        <Button asChild className="mt-auto self-start">
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
