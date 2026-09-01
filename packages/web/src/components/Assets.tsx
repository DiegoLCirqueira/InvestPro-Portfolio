import { usePortfolioPositions } from "@/hooks/usePortfolio";
import type { PortfolioAssetType, PortfolioPosition } from "@/types/portfolio";

const TYPE_LABELS: Record<PortfolioAssetType, string> = {
  CRYPTO: "CR",
  STOCK: "AC",
  FIXED_INCOME: "RF",
};

const TYPE_COLORS: Record<PortfolioAssetType, string> = {
  CRYPTO: "bg-brand-primary/15 text-brand-primary",
  STOCK: "bg-blue-500/15 text-blue-400",
  FIXED_INCOME: "bg-amber-500/15 text-amber-400",
};

function PositionRow({ position }: { position: PortfolioPosition }) {
  return (
    <div className="flex items-center justify-between p-3 hover:bg-gray-800/50 rounded-xl transition-colors">
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs uppercase ${TYPE_COLORS[position.type]}`}
        >
          {TYPE_LABELS[position.type]}
        </div>
        <div>
          <p className="font-bold">{position.ticker}</p>
          <p className="text-xs text-gray-500">
            {position.name} · {position.quantity}
          </p>
        </div>
      </div>

      <div className="text-right">
        <p className="font-bold">
          {new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(position.currentValue)}
        </p>
      </div>
    </div>
  );
}

export function Assets() {
  const { positions, error, isLoading, refetch } = usePortfolioPositions();

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-800 p-6 h-full">
        <h3 className="text-lg font-bold mb-4">Seus Ativos</h3>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded-xl bg-gray-900/40 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-800" />
                <div className="space-y-2">
                  <div className="h-3 w-16 bg-gray-800 rounded" />
                  <div className="h-2.5 w-20 bg-gray-800/70 rounded" />
                </div>
              </div>
              <div className="h-3 w-20 bg-gray-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-gray-800 p-6 h-full">
        <h3 className="text-lg font-bold mb-3">Seus Ativos</h3>
        <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
          <p className="text-sm text-red-500">Não foi possível carregar.</p>
          <button
            onClick={() => refetch()}
            className="px-3 py-1.5 rounded-lg bg-brand-primary text-black text-xs font-bold hover:opacity-90 transition-opacity"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-800 p-6 h-full flex flex-col">
      <h3 className="text-lg font-bold mb-4 shrink-0">Seus Ativos</h3>

      {positions.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-16">
          Nenhum ativo no portfólio.
        </p>
      ) : (
        <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {positions.map((position) => (
            <PositionRow key={position.id} position={position} />
          ))}
        </div>
      )}
    </div>
  );
}
