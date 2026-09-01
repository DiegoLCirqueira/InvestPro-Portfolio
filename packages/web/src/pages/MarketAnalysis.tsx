import { useState } from "react";
import { MarketSkeleton } from "@/components/skeletons/MarketSkeleton";
import { useMarketAssets } from "@/hooks/use-market-assets";
import type { MarketAsset, MarketAssetType } from "@/types/market";

const TYPE_FILTERS: { value: MarketAssetType | "ALL"; label: string }[] = [
  { value: "ALL", label: "Todos" },
  { value: "STOCK", label: "Ações" },
  { value: "CRYPTO", label: "Cripto" },
  { value: "FIXED_INCOME", label: "Renda Fixa" },
];

function formatPrice(price: number): string {
  return price.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  });
}

function formatPercent(value?: number): string {
  const v = value ?? 0;
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

function sentimentFor(asset: MarketAsset): string {
  const pct = asset.changePercent ?? asset.change24h;
  if (pct > 1) return "Oportunidade";
  if (pct < 0) return "Risco";
  return "Neutral";
}

function AssetTypeLabel({ type }: { type: MarketAssetType }) {
  const styles: Record<MarketAssetType, string> = {
    STOCK: "bg-blue-500/10 text-blue-400",
    CRYPTO: "bg-brand-primary/10 text-brand-primary",
    FIXED_INCOME: "bg-amber-500/10 text-amber-400",
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
        <h2 className="text-2xl font-bold text-white mb-6 tracking-tight">
          Análise de Mercado
        </h2>
        <MarketSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <h2 className="text-2xl font-bold text-white mb-6 tracking-tight">
          Análise de Mercado
        </h2>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 rounded-2xl border border-gray-800">
          <h3 className="text-white font-semibold text-lg">
            Não foi possível carregar os dados do mercado
          </h3>
          <p className="text-sm text-gray-500 text-center max-w-md">
            {error.message}
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 rounded-xl bg-brand-primary text-black text-sm font-bold hover:opacity-90 transition-opacity"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Análise de Mercado
        </h2>

        <div className="flex gap-2">
          {TYPE_FILTERS.map((filterOption) => (
            <button
              key={filterOption.value}
              onClick={() => setFilter(filterOption.value)}
              className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border transition-colors ${
                filter === filterOption.value
                  ? "bg-brand-primary text-black border-brand-primary"
                  : "bg-gray-900/60 text-gray-400 border-gray-800 hover:border-brand-primary/40"
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
              className="p-6 rounded-2xl border border-gray-800 hover:border-brand-primary/30 transition-colors"
            >
              <h4 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                {index.ticker}
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-gray-900 border border-gray-800">
                  {index.type}
                </span>
              </h4>

              <div className="space-y-1">
                <span className="text-3xl font-bold block tabular-nums text-white">
                  {formatPrice(index.price)}
                </span>
                <div
                  className={`flex items-center gap-2 text-sm font-semibold ${
                    isUp ? "text-brand-primary" : "text-red-500"
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

      <div className="flex-1 p-6 rounded-2xl border border-gray-800 flex flex-col min-h-0">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold">Composição e Performance</h3>
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] bg-gray-900 px-3 py-1 rounded-full border border-gray-800">
            Tempo Real
          </span>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {assets.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-16">
              Nenhum ativo encontrado para este filtro.
            </p>
          ) : (
            <table className="w-full text-left border-separate border-spacing-y-2">
              <thead>
                <tr className="text-gray-500 text-[10px] uppercase tracking-widest font-bold">
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
                      className="bg-gray-900/40 hover:bg-gray-800/60 transition-colors"
                    >
                      <td className="py-3 pl-4 rounded-l-xl border-y border-l border-gray-800/0 group-hover:border-brand-primary/30">
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-white transition-colors">
                            {asset.ticker}
                          </span>
                          <span className="text-[10px] text-gray-500 font-medium">
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
                          isUp ? "text-brand-primary" : "text-red-500"
                        }`}
                      >
                        {formatPercent(asset.changePercent)}
                      </td>
                      <td className="py-3 pr-4 rounded-r-xl text-right border-y border-r border-gray-800/0">
                        <span
                          className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-tighter ${
                            sentiment === "Oportunidade"
                              ? "bg-brand-primary/10 text-brand-primary"
                              : sentiment === "Risco"
                                ? "bg-red-500/10 text-red-500"
                                : "bg-gray-700/30 text-gray-400"
                          }`}
                        >
                          {sentiment}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
