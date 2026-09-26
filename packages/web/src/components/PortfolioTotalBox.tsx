import { TrendingDown, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/format";

interface PortfolioTotalBoxProps {
  /** Patrimônio total (caixa + posições + caixinha + moedas), o mesmo do gráfico. */
  totalEquity: number;
  /** Rentabilidade do período em %; sem base de comparação, o selo não aparece. */
  change?: number;
}

// Rodapé fixo de "Seus Ativos": fica visível por cima da lista, que rola
// por trás dele quando os ativos ocupam o espaço do card.
export function PortfolioTotalBox({ totalEquity, change }: PortfolioTotalBoxProps) {
  const isPositive = (change ?? 0) >= 0;

  return (
    <div className="shrink-0 mt-4 rounded-xl border border-border bg-secondary/60 p-4">
      <p className="text-xs font-medium text-muted-foreground">Valor total do portfólio</p>
      <div className="mt-1 flex flex-wrap items-end gap-2">
        <span className="text-xl font-bold text-foreground tabular-nums">
          {formatCurrency(totalEquity)}
        </span>
        {change !== undefined && (
          <span
            className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg mb-0.5 ${
              isPositive
                ? "bg-brand-primary/10 text-brand-primary"
                : "bg-brand-danger/10 text-brand-danger"
            }`}
          >
            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {isPositive ? "+" : ""}
            {change.toFixed(2)}%
          </span>
        )}
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Saldo em conta + investimentos + caixinha + moedas estrangeiras.
      </p>
    </div>
  );
}
