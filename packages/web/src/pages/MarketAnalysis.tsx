import { Link, useSearchParams } from "react-router-dom";
import { SearchX } from "lucide-react";
import { MarketSkeleton } from "@/components/skeletons/MarketSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { FilterChips } from "@/components/FilterChips";
import { PageHeader } from "@/components/PageHeader";
import { SectionTitle } from "@/components/SectionTitle";
import { EstimatedPriceTag } from "@/components/market/EstimatedPriceTag";
import { EstimatedPricesBanner } from "@/components/market/EstimatedPricesBanner";
import { StatusBadge, type StatusTone } from "@/components/StatusBadge";
import { useMarketAssets } from "@/hooks/use-market-assets";
import {
  formatCurrency,
  formatPercent as formatPercentValue,
} from "@/lib/format";
import { assetDisplayName, isEstimatedPrice, tradeLinkLabel } from "@/lib/market";
import type { MarketAsset, MarketAssetType } from "@/types/market";

// Tipo como texto simples (mesmo nome do filtro): com um selo colorido para o tipo e outro para
// o sentimento, cada linha tinha duas pílulas disputando a atenção.
const ASSET_TYPE_LABELS: Record<MarketAssetType, string> = {
  STOCK: "Ação",
  CRYPTO: "Cripto",
  FIXED_INCOME: "Renda fixa",
};

type Sentiment = "Oportunidade" | "Risco" | "Neutro";

const SENTIMENT_TONES: Record<Exclude<Sentiment, "Neutro">, StatusTone> = {
  Oportunidade: "success",
  Risco: "danger",
};

const TYPE_FILTERS: { value: MarketAssetType | "ALL"; label: string }[] = [
  { value: "ALL", label: "Todos" },
  { value: "STOCK", label: "Ações" },
  { value: "CRYPTO", label: "Cripto" },
  { value: "FIXED_INCOME", label: "Renda fixa" },
];

function formatPrice(price: number): string {
  return formatCurrency(price);
}

function formatPercent(value?: number): string {
  return formatPercentValue(value ?? 0, { showSign: true });
}

function sentimentFor(asset: MarketAsset): Sentiment {
  const pct = asset.changePercent ?? asset.change24h;
  if (pct > 1) return "Oportunidade";
  if (pct < 0) return "Risco";
  return "Neutro";
}

// Selo só quando há algo a dizer: "Neutro" some (antes era um selo cinza quase invisível).
function SentimentBadge({ asset }: { asset: MarketAsset }) {
  const sentiment = sentimentFor(asset);
  if (sentiment === "Neutro") return null;
  return <StatusBadge label={sentiment} tone={SENTIMENT_TONES[sentiment]} uniformWidth />;
}

// Variação zero é neutra: nem verde de alta nem vermelho de queda.
function changeToneClass(asset: MarketAsset): string {
  const pct = asset.changePercent ?? asset.change24h;
  if (pct > 0) return "text-brand-primary";
  if (pct < 0) return "text-destructive";
  return "text-muted-foreground";
}

// Clicar no ativo leva ao formulário de ordem já com ele escolhido.
function orderLinkFor(asset: MarketAsset): string {
  return `/orders?ticker=${encodeURIComponent(asset.ticker)}`;
}

// Linha da lista do celular: só divisória, sem card próprio dentro do card (o recuo dobrava).
function AssetRow({ asset }: { asset: MarketAsset }) {
  const name = assetDisplayName(asset);
  return (
    <li>
      <Link
        to={orderLinkFor(asset)}
        aria-label={tradeLinkLabel(asset)}
        className="block -mx-2 px-2 py-3 rounded-lg hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mb-2">
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="font-bold text-foreground">{asset.ticker}</span>
            <span className="text-xs text-muted-foreground">
              {ASSET_TYPE_LABELS[asset.type]}
            </span>
          </div>
          <SentimentBadge asset={asset} />
        </div>
        {name && (
          <p className="text-xs text-muted-foreground mb-2 truncate">
            {name}
          </p>
        )}
        <div className="flex items-center justify-between">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-bold tabular-nums text-foreground">
              {formatPrice(asset.price)}
            </span>
            {isEstimatedPrice(asset) && <EstimatedPriceTag />}
          </span>
          <span
            className={`text-sm font-bold tabular-nums ${changeToneClass(asset)}`}
          >
            {formatPercent(asset.changePercent)}
          </span>
        </div>
      </Link>
    </li>
  );
}

export function MarketAnalysis() {
  // Filtro na URL (?tipo=STOCK): dá para compartilhar e as Recomendações abrem o Mercado já filtrado.
  const [searchParams, setSearchParams] = useSearchParams();
  const tipo = searchParams.get("tipo");
  const filter: MarketAssetType | "ALL" =
    TYPE_FILTERS.find((option) => option.value === tipo)?.value ?? "ALL";
  const setFilter = (value: MarketAssetType | "ALL") =>
    setSearchParams(value === "ALL" ? {} : { tipo: value }, { replace: true });

  const { data, error, isLoading, refetch } = useMarketAssets({
    type: filter === "ALL" ? undefined : filter,
  });

  const assets = data?.items ?? [];

  const hasEstimatedPrices = assets.some(isEstimatedPrice);
  const highlights = [...assets]
    .sort(
      (a, b) =>
        (b.changePercent ?? b.change24h) - (a.changePercent ?? a.change24h),
    )
    .slice(0, 3);

  if (isLoading) {
    return (
      <div className="flex flex-col animate-in fade-in duration-500">
        <PageHeader title="Análise de Mercado" />
        <MarketSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col">
        <PageHeader title="Análise de Mercado" />
        <ErrorState
          title="Não foi possível carregar os dados do mercado"
          message={error.message}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col animate-in fade-in duration-500">
      <PageHeader
        title="Análise de Mercado"
        actions={
          <FilterChips
            options={TYPE_FILTERS}
            value={filter}
            onChange={setFilter}
            ariaLabel="Filtrar por tipo de ativo"
          />
        }
      />

      {hasEstimatedPrices && <EstimatedPricesBanner />}

      {/* Celular: cada destaque é uma linha compacta (ticker à esquerda, preço à direita); antes
          os 3 cards ocupavam a primeira tela inteira. */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 mb-6 md:mb-8">
        {highlights.map((index) => {
          return (
            // Destaque clicável como as linhas da tabela: no celular é o primeiro alvo de toque.
            <Link
              key={index.ticker}
              to={orderLinkFor(index)}
              aria-label={tradeLinkLabel(index)}
              className="flex items-center justify-between gap-3 md:block p-4 md:p-6 rounded-2xl border border-border bg-surface-1 hover:border-brand-primary/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wider md:mb-4 flex items-center gap-2">
                {index.ticker}
                <span className="text-2xs font-semibold px-1.5 py-0.5 rounded bg-secondary border border-border">
                  {ASSET_TYPE_LABELS[index.type]}
                </span>
              </h2>

              <div className="min-w-0 space-y-1 text-right md:text-left">
                <div className="flex flex-wrap items-center justify-end md:justify-start gap-x-3 gap-y-1">
                  <span className="text-xl md:text-3xl font-bold tabular-nums text-foreground">
                    {formatPrice(index.price)}
                  </span>
                  {isEstimatedPrice(index) && <EstimatedPriceTag />}
                </div>
                <div
                  className={`flex items-center justify-end md:justify-start gap-2 text-sm font-semibold ${changeToneClass(
                    index,
                  )}`}
                >
                  <span>{formatPercent(index.changePercent)}</span>
                  {assetDisplayName(index) && (
                    <span className="font-normal text-muted-foreground">
                      {assetDisplayName(index)}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="p-4 sm:p-6 rounded-2xl border border-border bg-surface-1 flex flex-col min-h-0">
        <div className="flex flex-wrap justify-between items-center gap-2 mb-4 sm:mb-6">
          <SectionTitle>Composição e Performance</SectionTitle>
          <span className="whitespace-nowrap text-2xs font-semibold uppercase tracking-wider text-muted-foreground bg-secondary px-3 py-1 rounded-full border border-border">
            Tempo Real
          </span>
        </div>

        {/* Sem rolagem interna: com a barra oculta, linhas (ex.: SELIC) ficavam escondidas. A página rola. */}
        <div>
          {assets.length === 0 ? (
            <EmptyState
              icon={SearchX}
              message="Nenhum ativo encontrado para este filtro."
            />
          ) : (
            <>
              {/* Mobile/tablet (abaixo de nav): lista. A tabela exige largura para as colunas fazerem sentido. */}
              <ul className="flex flex-col divide-y divide-border nav:hidden">
                {assets.map((asset) => (
                  <AssetRow key={asset.id} asset={asset} />
                ))}
              </ul>

              {/* Desktop (>=nav): tabela. table-fixed + colgroup: largura das colunas
                  não pode depender do conteúdo da seleção atual (senão o layout
                  "pula" ao trocar o filtro Todos/Ações/Cripto/Renda fixa). */}
              <table className="hidden nav:table w-full table-fixed text-left border-separate border-spacing-y-2">
                {/* Números à direita (tabular-nums) para as casas se alinharem entre as linhas;
                    Ativo mais estreito para não abrir um vão até o preço. */}
                <colgroup>
                  <col className="w-[30%]" />
                  <col className="w-[16%]" />
                  <col className="w-[20%]" />
                  <col className="w-[14%]" />
                  <col className="w-[20%]" />
                </colgroup>
                <thead>
                  <tr className="text-muted-foreground text-2xs font-semibold uppercase tracking-wider">
                    <th className="pb-2 pl-4">Ativo</th>
                    <th className="pb-2">Tipo</th>
                    <th className="pb-2 text-right">Preço</th>
                    <th className="pb-2 text-right">Variação</th>
                    <th className="pb-2 pr-4 text-right">Sentimento</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset) => {
                    const name = assetDisplayName(asset);
                    return (
                      <tr
                        key={asset.id}
                        className="relative bg-secondary/40 hover:bg-secondary/70 transition-colors"
                      >
                        <td className="py-3 pl-4 rounded-l-xl border-y border-l border-transparent">
                          <div className="flex flex-col min-w-0">
                            {/* after:inset-0 estica o link pela linha toda: um único link por ativo. */}
                            <Link
                              to={orderLinkFor(asset)}
                              aria-label={tradeLinkLabel(asset)}
                              className="font-bold text-sm text-foreground transition-colors truncate after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
                            >
                              {asset.ticker}
                            </Link>
                            {name && (
                              <span className="text-xs text-muted-foreground truncate">
                                {name}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 text-sm text-muted-foreground">
                          {ASSET_TYPE_LABELS[asset.type]}
                        </td>
                        <td className="py-3 text-sm font-medium tabular-nums">
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            {isEstimatedPrice(asset) && <EstimatedPriceTag />}
                            <span>{formatPrice(asset.price)}</span>
                          </div>
                        </td>
                        <td
                          className={`py-3 text-sm font-bold tabular-nums text-right truncate ${changeToneClass(
                            asset,
                          )}`}
                        >
                          {formatPercent(asset.changePercent)}
                        </td>
                        <td className="py-3 pr-4 rounded-r-xl text-right border-y border-r border-transparent">
                          <SentimentBadge asset={asset} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
