import { usePortfolioPositions } from "@/hooks/usePortfolio";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { formatCurrency } from "@/lib/format";
import { PortfolioTotalBox } from "@/components/PortfolioTotalBox";
import type { PortfolioAssetType, PortfolioPosition } from "@/types/portfolio";

const TYPE_LABELS: Record<PortfolioAssetType, string> = {
  CRYPTO: "CR",
  STOCK: "AC",
  FIXED_INCOME: "RF",
};

const TYPE_COLORS: Record<PortfolioAssetType, string> = {
  CRYPTO: "bg-brand-primary/15 text-brand-primary",
  STOCK: "bg-info/15 text-info",
  FIXED_INCOME: "bg-warning/15 text-warning",
};

function PositionRow({ position }: { position: PortfolioPosition }) {
  return (
    <div className="flex items-center justify-between p-3 hover:bg-secondary rounded-xl transition-colors">
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center font-bold text-xs uppercase ${TYPE_COLORS[position.type]}`}
        >
          {TYPE_LABELS[position.type]}
        </div>
        <div>
          <p className="font-bold">{position.ticker}</p>
          <p className="text-xs text-muted-foreground">
            {position.name} · {position.quantity}
          </p>
        </div>
      </div>

      <div className="text-right">
        <p className="font-bold">{formatCurrency(position.currentValue)}</p>
      </div>
    </div>
  );
}

interface AssetsProps {
  /** Rentabilidade do período (%), exibida junto do valor total. */
  change?: number;
}

export function Assets({ change }: AssetsProps) {
  const { data, positions, error, isLoading, refetch } = usePortfolioPositions();

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border p-6 nav:h-full">
        <h3 className="text-lg font-bold mb-4">Seus Ativos</h3>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded-xl bg-secondary/40 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary" />
                <div className="space-y-2">
                  <div className="h-3 w-16 bg-secondary rounded" />
                  <div className="h-2.5 w-20 bg-secondary/70 rounded" />
                </div>
              </div>
              <div className="h-3 w-20 bg-secondary rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-border p-6 nav:h-full">
        <h3 className="text-lg font-bold mb-3">Seus Ativos</h3>
        <ErrorState
          message={error.message}
          onRetry={refetch}
          bordered={false}
          className="py-8"
        />
      </div>
    );
  }

  // Desktop: o card tem a altura da linha do grid; a lista ocupa o que
  // sobra (min-h-0 + overflow) e rola, e o total fica fixo no rodapé.
  return (
    <div className="rounded-2xl border border-border p-6 nav:h-full flex flex-col nav:min-h-0">
      <h3 className="text-lg font-bold mb-4 shrink-0">Seus Ativos</h3>

      {positions.length === 0 ? (
        <div className="flex-1">
          <EmptyState
            message="Você ainda não possui ativos na carteira. Comece investindo para ver sua posição aqui."
            action={{ label: "Ver ativos disponíveis", to: "/market" }}
          />
        </div>
      ) : (
        <div className="space-y-4 flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
          {positions.map((position) => (
            <PositionRow key={position.id} position={position} />
          ))}
        </div>
      )}

      <PortfolioTotalBox totalEquity={data?.totalEquity ?? 0} change={change} />
    </div>
  );
}
