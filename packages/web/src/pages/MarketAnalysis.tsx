import { Link, useSearchParams } from "react-router-dom";
import { ChevronRight, SearchX } from "lucide-react";
import { MarketSkeleton } from "@/components/skeletons/MarketSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { FilterChips } from "@/components/FilterChips";
import { PageHeader } from "@/components/PageHeader";
import { SectionTitle } from "@/components/SectionTitle";
import { EstimatedPriceNote } from "@/components/market/EstimatedPriceNote";
import { EstimatedPricesBanner } from "@/components/market/EstimatedPricesBanner";
import { StatusBadge, type StatusTone } from "@/components/StatusBadge";
import { useMarketAssets } from "@/hooks/use-market-assets";
import {
  formatCurrency,
  formatPercent as formatPercentValue,
} from "@/lib/format";
import {
  ESTIMATED_PRICE_TITLE,
  assetDisplayName,
  isEstimatedPrice,
  tradeLinkLabel,
} from "@/lib/market";
import type { MarketAsset, MarketAssetType } from "@/types/market";
import { cardClassName } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
  return (
    <StatusBadge
      label={sentiment}
      tone={SENTIMENT_TONES[sentiment]}
      uniformWidth
    />
  );
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

// Borda no tom de aviso (>= 3:1 contra a superfície nos dois temas) no lugar do selo "estimado".
function estimatedProps(asset: MarketAsset) {
  return isEstimatedPrice(asset) ? { title: ESTIMATED_PRICE_TITLE } : {};
}

// Linha da lista do celular: só divisória, sem card próprio dentro do card (o recuo dobrava).
function AssetRow({ asset }: { asset: MarketAsset }) {
  const name = assetDisplayName(asset);
  return (
    <li>
      <Link
        to={orderLinkFor(asset)}
        aria-label={tradeLinkLabel(asset)}
        {...estimatedProps(asset)}
        className={cn(
          "flex items-center gap-2 -mx-2 pl-2 py-3 rounded-lg border hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isEstimatedPrice(asset)
            ? "border-warning-border ring-1 ring-inset ring-warning-border"
            : "border-transparent",
        )}
      >
        <div className="min-w-0 flex-1">
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
            <p className="text-xs text-muted-foreground mb-2 truncate">{name}</p>
          )}
          <div className="flex items-center justify-between">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-bold tabular-nums text-foreground">
                {formatPrice(asset.price)}
              </span>
            </span>
            <span
              className={`text-sm font-bold tabular-nums ${changeToneClass(asset)}`}
            >
              {formatPercent(asset.changePercent)}
            </span>
          </div>
        </div>
        {/* Sem hover no celular: a seta fica sempre visível para dizer que a linha abre a ordem. */}
        <ChevronRight
          aria-hidden="true"
          size={18}
          strokeWidth={2.25}
          className="w-7 shrink-0 text-muted-foreground"
        />
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

  const { data, error, isLoading, refetch, dataUpdatedAt } = useMarketAssets({
    type: filter === "ALL" ? undefined : filter,
  });

  const assets = data?.items ?? [];
  // Hora em que as cotações chegaram: a lista não se atualiza sozinha, então "Tempo real" (que
  // ainda parecia um botão) prometia o que a tela não faz.
  const quotesLoadedAt = (dataUpdatedAt ?? new Date()).toLocaleTimeString(
    "pt-BR",
    { hour: "2-digit", minute: "2-digit" },
  );

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

      {/* O título diz o que são os 3 cards (antes pareciam ativos soltos). */}
      {highlights.length > 0 && (
        <SectionTitle className="mb-3 md:mb-4">Maiores altas de hoje</SectionTitle>
      )}

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
              {...estimatedProps(index)}
              className={cn(
                cardClassName,
                "group relative flex min-h-16 items-center gap-2 py-3 pr-2 md:block md:p-6 hover:border-brand-primary/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isEstimatedPrice(index) &&
                  "border-warning-border ring-1 ring-inset ring-warning-border hover:border-warning-border",
              )}
            >
              <p className="flex-1 text-muted-foreground text-xs font-semibold uppercase tracking-wider md:mb-4 flex items-center gap-2">
                {index.ticker}
                <span className="text-2xs font-semibold px-1.5 py-0.5 rounded-lg bg-secondary border border-border">
                  {ASSET_TYPE_LABELS[index.type]}
                </span>
              </p>

              <div className="min-w-0 space-y-1 text-right md:text-left">
                <div className="flex flex-wrap items-center justify-end md:justify-start gap-x-3 gap-y-1">
                  <span className="text-lg md:text-3xl font-bold tabular-nums text-foreground">
                    {formatPrice(index.price)}
                  </span>
                </div>
                <div
                  className={`flex items-center justify-end md:justify-start gap-2 text-sm font-semibold ${changeToneClass(
                    index,
                  )}`}
                >
                  <span>{formatPercent(index.changePercent)}</span>
                  {/* No celular a linha só tem preço e variação; o nome cabe no card largo. */}
                  {assetDisplayName(index) && (
                    <span className="hidden md:inline font-normal text-muted-foreground">
                      {assetDisplayName(index)}
                    </span>
                  )}
                </div>
              </div>

              {/* Seta discreta: diz que o card abre a ordem. No computador ganha o "Negociar" ao
                  passar o mouse; no celular (sem hover) fica sempre visível. */}
              <span
                aria-hidden="true"
                className="flex size-7 shrink-0 items-center justify-center text-muted-foreground transition-colors group-hover:text-brand-primary md:absolute md:right-2 md:top-4 md:size-auto md:h-7 md:gap-1 md:rounded-full md:px-2 md:text-xs md:font-bold md:group-hover:bg-brand-primary/10 md:group-focus-visible:bg-brand-primary/10 md:group-focus-visible:text-brand-primary"
              >
                <span className="hidden md:group-hover:inline md:group-focus-visible:inline">
                  Negociar
                </span>
                <ChevronRight size={18} strokeWidth={2.25} />
              </span>
            </Link>
          );
        })}
      </div>

      <div className={cn(cardClassName, "flex flex-col min-h-0")}>
        <div className="flex flex-wrap justify-between items-center gap-2 mb-4 sm:mb-6">
          <SectionTitle>Composição e Performance</SectionTitle>
          {/* Texto simples, sem borda nem fundo, para não parecer um botão. */}
          <p className="text-xs text-muted-foreground tabular-nums">
            Cotações de {quotesLoadedAt}
          </p>
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
                  <col className="w-[14%]" />
                  <col className="w-[20%]" />
                  <col className="w-[14%]" />
                  <col className="w-[18%]" />
                  <col className="w-11" />
                </colgroup>
                <thead>
                  <tr className="text-muted-foreground text-2xs font-semibold uppercase tracking-wider">
                    <th className="pb-2 pl-4">Ativo</th>
                    <th className="pb-2">Tipo</th>
                    <th className="pb-2 text-right">Preço</th>
                    <th className="pb-2 text-right">Variação</th>
                    <th className="pb-2 pr-4 text-right">Sentimento</th>
                    <th className="pb-2">
                      <span className="sr-only">Negociar</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset) => {
                    const name = assetDisplayName(asset);
                    // Com border-separate a borda da linha é a das células: todas levam o tom de aviso.
                    const rowBorder = isEstimatedPrice(asset)
                      ? "border-warning-border"
                      : "border-transparent";
                    return (
                      <tr
                        key={asset.id}
                        {...estimatedProps(asset)}
                        className="group relative bg-secondary/40 hover:bg-secondary/70 transition-colors"
                      >
                        <td
                          className={`py-3 pl-4 rounded-l-lg border-y-2 border-l-2 ${rowBorder}`}
                        >
                          <div className="flex flex-col min-w-0">
                            {/* after:inset-0 estica o link pela linha toda: um único link por ativo. */}
                            <Link
                              to={orderLinkFor(asset)}
                              aria-label={tradeLinkLabel(asset)}
                              className="font-bold text-sm text-foreground transition-colors truncate after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
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
                        <td
                          className={`py-3 text-sm text-muted-foreground border-y-2 ${rowBorder}`}
                        >
                          {ASSET_TYPE_LABELS[asset.type]}
                        </td>
                        <td
                          className={`py-3 text-sm font-medium tabular-nums border-y-2 ${rowBorder}`}
                        >
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            {isEstimatedPrice(asset) && <EstimatedPriceNote />}
                            <span>{formatPrice(asset.price)}</span>
                          </div>
                        </td>
                        <td
                          className={`py-3 text-sm font-bold tabular-nums text-right truncate border-y-2 ${rowBorder} ${changeToneClass(
                            asset,
                          )}`}
                        >
                          {formatPercent(asset.changePercent)}
                        </td>
                        <td
                          className={`py-3 pr-4 text-right border-y-2 ${rowBorder}`}
                        >
                          <SentimentBadge asset={asset} />
                        </td>
                        {/* Seta discreta que fica verde com a linha sob o mouse: a linha abre a ordem. */}
                        <td
                          className={`py-3 rounded-r-lg border-y-2 border-r-2 ${rowBorder}`}
                        >
                          <ChevronRight
                            aria-hidden="true"
                            size={18}
                            strokeWidth={2.25}
                            className="mx-auto text-muted-foreground transition-colors group-hover:text-brand-primary group-focus-within:text-brand-primary"
                          />
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
