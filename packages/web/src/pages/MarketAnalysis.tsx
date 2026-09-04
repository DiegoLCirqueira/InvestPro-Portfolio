import { useState } from "react";
import { SearchX } from "lucide-react";
import { MarketSkeleton } from "@/components/skeletons/MarketSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { useMarketAssets } from "@/hooks/use-market-assets";
import { formatCurrency, formatPercent as formatPercentValue } from "@/lib/format";
import type { MarketAsset, MarketAssetType } from "@/types/market";

const TYPE_FILTERS: { value: MarketAssetType | "ALL"; label: string }[] = [
  { value: "ALL", label: "Todos" },
  { value: "STOCK", label: "Ações" },
  { value: "CRYPTO", label: "Cripto" },
  { value: "FIXED_INCOME", label: "Renda Fixa" },
];

function formatPrice(price: number): string {
  return formatCurrency(price);
}

function formatPercent(value?: number): string {
  return formatPercentValue(value ?? 0, { showSign: true });
}

function sentimentFor(asset: MarketAsset): string {
  const pct = asset.changePercent ?? asset.change24h;
  if (pct > 1) return "Oportunidade";
  if (pct < 0) return "Risco";
  return "Neutral";
}

function AssetTypeLabel({ type }: { type: MarketAssetType }) {
  const styles: Record<MarketAssetType, string> = {
    STOCK: "bg-info/10 text-info",
    CRYPTO: "bg-brand-primary/10 text-brand-primary",
    FIXED_INCOME: "bg-warning/10 text-warning",
  };
  const labels: Record<MarketAssetType, string> = {
    STOCK: "Ação",
    CRYPTO: "Cripto",
    FIXED_INCOME: "RF",
  };
  return (
    <span
      className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-tighter ${styles[type]}`}
    >
      {labels[type]}
    </span>
  );
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  return (
    <span
      className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-tighter ${
        sentiment === "Oportunidade"
          ? "bg-brand-primary/10 text-brand-primary"
          : sentiment === "Risco"
            ? "bg-destructive/10 text-destructive"
            : "bg-secondary text-muted-foreground"
      }`}
    >
      {sentiment}
    </span>
  );
}

function AssetCard({ asset }: { asset: MarketAsset }) {
  const isUp = (asset.changePercent ?? asset.change24h) >= 0;
  const sentiment = sentimentFor(asset);
  return (
    <div className="p-4 rounded-xl border border-border bg-surface-2">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-foreground">{asset.ticker}</span>
          <AssetTypeLabel type={asset.type} />
        </div>
        <SentimentBadge sentiment={sentiment} />
      </div>
      <p className="text-[10px] text-muted-foreground font-medium mb-2 truncate">
        {asset.name}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold tabular-nums text-foreground">
          {formatPrice(asset.price)}
        </span>
        <span
          className={`text-sm font-bold tabular-nums ${
            isUp ? "text-brand-primary" : "text-destructive"
          }`}
        >
          {formatPercent(asset.changePercent)}
        </span>
      </div>
    </div>
  );
}

export function MarketAnalysis() {
  const [filter, setFilter] = useState<MarketAssetType | "ALL">("ALL");

  const {
    data,
    error,
    isLoading,
    refetch,
  } = useMarketAssets({
    type: filter === "ALL" ? undefined : filter,
  });

  const assets = data?.items ?? [];

  const highlights = [...assets]
    .sort((a, b) => (b.changePercent ?? b.change24h) - (a.changePercent ?? a.change24h))
    .slice(0, 3);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-500">
        <h2 className="text-2xl font-bold text-foreground mb-6 tracking-tight">
          Análise de Mercado
        </h2>
        <MarketSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <h2 className="text-2xl font-bold text-foreground mb-6 tracking-tight">
          Análise de Mercado
        </h2>
        <ErrorState
          title="Não foi possível carregar os dados do mercado"
          message={error.message}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-500">
      <div className="flex flex-col nav:flex-row nav:items-center nav:justify-between gap-3 mb-6">
        <h2 className="text-2xl font-bold text-foreground tracking-tight">
          Análise de Mercado
        </h2>

        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 nav:mx-0 nav:px-0 nav:overflow-visible custom-scrollbar">
          {TYPE_FILTERS.map((filterOption) => (
            <button
              key={filterOption.value}
              onClick={() => setFilter(filterOption.value)}
              className={`shrink-0 whitespace-nowrap min-h-11 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                filter === filterOption.value
                  ? "bg-brand-primary text-black border-brand-primary"
                  : "bg-secondary/60 text-muted-foreground border-border hover:border-brand-primary/40"
              }`}
            >
              {filterOption.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {highlights.map((index) => {
          const isUp = (index.changePercent ?? index.change24h) >= 0;
          return (
            <div
              key={index.ticker}
              className="p-6 rounded-2xl border border-border hover:border-brand-primary/30 transition-colors"
            >
              <h4 className="text-muted-foreground text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                {index.ticker}
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-secondary border border-border">
                  {index.type}
                </span>
              </h4>

              <div className="space-y-1">
                <span className="text-3xl font-bold block tabular-nums text-foreground">
                  {formatPrice(index.price)}
                </span>
                <div
                  className={`flex items-center gap-2 text-sm font-semibold ${
                    isUp ? "text-brand-primary" : "text-destructive"
                  }`}
                >
                  <span>{formatPercent(index.changePercent)}</span>
                  <span className="opacity-50 font-normal">
                    ({index.name})
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex-1 p-6 rounded-2xl border border-border flex flex-col min-h-0">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold">Composição e Performance</h3>
          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] bg-secondary px-3 py-1 rounded-full border border-border">
            Tempo Real
          </span>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {assets.length === 0 ? (
            <EmptyState icon={SearchX} message="Nenhum ativo encontrado para este filtro." />
          ) : (
            <>
              {/* Mobile/tablet (abaixo de nav): cards. A tabela exige largura para as colunas fazerem sentido. */}
              <div className="flex flex-col gap-3 nav:hidden">
                {assets.map((asset) => (
                  <AssetCard key={asset.id} asset={asset} />
                ))}
              </div>

              {/* Desktop (>=nav): tabela */}
              <table className="hidden nav:table w-full text-left border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-muted-foreground text-[10px] uppercase tracking-widest font-bold">
                    <th className="pb-2 pl-4">Ativo</th>
                    <th className="pb-2">Preço</th>
                    <th className="pb-2">Tipo</th>
                    <th className="pb-2">Variação</th>
                    <th className="pb-2 pr-4 text-right">Sentimento</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset) => {
                    const isUp = (asset.changePercent ?? asset.change24h) >= 0;
                    const sentiment = sentimentFor(asset);
                    return (
                      <tr
                        key={asset.id}
                        className="bg-secondary/40 hover:bg-secondary/70 transition-colors"
                      >
                        <td className="py-3 pl-4 rounded-l-xl border-y border-l border-transparent">
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-foreground transition-colors">
                              {asset.ticker}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-medium">
                              {asset.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 text-sm font-medium tabular-nums">
                          {formatPrice(asset.price)}
                        </td>
                        <td className="py-3">
                          <AssetTypeLabel type={asset.type} />
                        </td>
                        <td
                          className={`py-3 text-sm font-bold tabular-nums ${
                            isUp ? "text-brand-primary" : "text-destructive"
                          }`}
                        >
                          {formatPercent(asset.changePercent)}
                        </td>
                        <td className="py-3 pr-4 rounded-r-xl text-right border-y border-r border-transparent">
                          <SentimentBadge sentiment={sentiment} />
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
