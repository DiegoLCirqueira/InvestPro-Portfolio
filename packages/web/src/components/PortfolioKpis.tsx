import type { ReactNode } from "react";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

interface PortfolioKpisProps {
  /** Patrimônio total: caixa + posições + caixinha + moedas em BRL (o mesmo do gráfico). */
  totalEquity: number;
  /** Dinheiro livre em conta: o que dá para usar em ordens, câmbio e transferências. */
  availableBalance: number;
  /** Rentabilidade do período em %, já sem aportes (servidor); null sem base de comparação. */
  returnPct: number | null;
  /** Ganho do período em R$, sem aportes e retiradas; null sem base de comparação. */
  gain: number | null;
  /** Ex.: "30 dias". */
  periodLabel: string;
}

function KpiTile({
  label,
  hint,
  highlight = false,
  children,
}: {
  label: string;
  hint: string;
  highlight?: boolean;
  children: ReactNode;
}) {
  return (
    <Card className={cn("flex flex-col gap-1", highlight && "border-primary/40")}>
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="flex flex-wrap items-baseline gap-x-2 gap-y-1">{children}</dd>
      <dd className="text-xs text-muted-foreground">{hint}</dd>
    </Card>
  );
}

// Faixa do topo do Painel: o patrimônio total (o número mais importante, que ficava no pé de
// "Seus Ativos") em destaque, o saldo livre e o rendimento do período. O rendimento desconta
// depósitos e transferências: senão um depósito aparecia como ganho.
export function PortfolioKpis({
  totalEquity,
  availableBalance,
  returnPct,
  gain,
  periodLabel,
}: PortfolioKpisProps) {
  // Variação zero é neutra: nem verde de alta nem vermelho de queda.
  const direction = !returnPct ? "flat" : returnPct > 0 ? "up" : "down";
  const DirectionIcon = { up: TrendingUp, down: TrendingDown, flat: Minus }[direction];
  const toneClass = {
    up: "text-primary",
    down: "text-destructive",
    flat: "text-muted-foreground",
  }[direction];

  return (
    <dl className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <KpiTile
        label="Patrimônio total"
        hint="Saldo em conta + investimentos + caixinha + moedas estrangeiras."
        highlight
      >
        <span className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
          {formatCurrency(totalEquity)}
        </span>
      </KpiTile>

      <KpiTile
        label="Saldo em conta"
        hint="Disponível para investir, transferir e fazer câmbio."
      >
        <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
          {formatCurrency(availableBalance)}
        </span>
      </KpiTile>

      <KpiTile
        label={`Rendimento em ${periodLabel}`}
        hint={
          returnPct === null
            ? "Aparece a partir do segundo dia de histórico."
            : "Não conta depósitos nem transferências."
        }
      >
        {returnPct === null ? (
          <span className="text-2xl font-bold text-muted-foreground">—</span>
        ) : (
          <>
            <span
              className={cn(
                "flex items-center gap-1 text-2xl font-bold tracking-tight tabular-nums",
                toneClass,
              )}
            >
              <DirectionIcon size={20} aria-hidden="true" />
              {formatPercent(returnPct, { showSign: true })}
            </span>
            {gain !== null && (
              <span className="text-sm font-semibold text-muted-foreground tabular-nums">
                {gain > 0 ? "+" : ""}
                {formatCurrency(gain)}
              </span>
            )}
          </>
        )}
      </KpiTile>
    </dl>
  );
}
