import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { PortfolioBreakdownItem } from "@/lib/portfolio-breakdown";

interface PortfolioTotalBoxProps {
  /** Patrimônio total (caixa + posições + Caixinha + moedas), o mesmo do gráfico. */
  totalEquity: number;
  /** Rentabilidade do período em %; sem base de comparação, o selo não aparece. */
  change?: number;
  /** Partes que somam o total; sem elas (ainda carregando), fica a frase do que o total inclui. */
  breakdown?: PortfolioBreakdownItem[] | null;
}

// Rodapé fixo de "Seus Ativos": fica visível por cima da lista, que rola
// por trás dele quando os ativos ocupam o espaço do card.
export function PortfolioTotalBox({
  totalEquity,
  change,
  breakdown,
}: PortfolioTotalBoxProps) {
  // Variação zero é neutra: nem verde de alta nem vermelho de queda.
  const direction = !change ? "flat" : change > 0 ? "up" : "down";
  const DirectionIcon = { up: TrendingUp, down: TrendingDown, flat: Minus }[
    direction
  ];

  return (
    <div className="shrink-0 mt-4 rounded-xl border border-border bg-secondary/60 p-4">
      <p className="text-xs font-medium text-muted-foreground">
        Valor total do portfólio
      </p>
      <div className="mt-1 flex flex-wrap items-end gap-2">
        <span className="text-xl font-bold text-foreground tabular-nums">
          {formatCurrency(totalEquity)}
        </span>
        {change !== undefined && (
          <span
            className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg mb-0.5 ${
              {
                up: "bg-brand-primary/10 text-brand-primary",
                down: "bg-brand-danger/10 text-brand-danger",
                flat: "bg-secondary text-muted-foreground",
              }[direction]
            }`}
          >
            <DirectionIcon size={12} aria-hidden="true" />
            {formatPercent(change, { showSign: true })}
          </span>
        )}
      </div>
      {breakdown ? (
        // Compacto, numa linha que quebra: "Saldo em conta R$ X · Investimentos R$ Y · …".
        <dl className="mt-1 flex flex-wrap gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
          {breakdown.map((item, index) => (
            <div key={item.label} className="flex gap-1">
              <dt>
                {index > 0 && <span aria-hidden="true">· </span>}
                {item.label}
              </dt>
              <dd className="font-semibold tabular-nums text-foreground">
                {formatCurrency(item.value)}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">
          Saldo em conta + investimentos + Caixinha + moedas estrangeiras.
        </p>
      )}
    </div>
  );
}
