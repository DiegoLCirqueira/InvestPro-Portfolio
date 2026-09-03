import { TrendingDown, TrendingUp } from "lucide-react";

interface SummaryCardProps {
  balance: number;
  change: number;
}

export function SummaryCard({ balance, change }: SummaryCardProps) {
  const formattedBalance = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(balance);

  const isPositive = change >= 0;

  return (
    <div className="p-6 rounded-2xl border border-border shadow-xl">
      <p className="text-muted-foreground text-sm font-medium mb-1">
        Valor Total do Portfólio
      </p>

      <div className="flex items-end gap-3">
        <h3 className="text-3xl font-bold text-foreground tracking-tight">
          {formattedBalance}
        </h3>
        <span
          className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg mb-1 ${
            isPositive
              ? "bg-brand-primary/10 text-brand-primary"
              : "bg-brand-danger/10 text-brand-danger"
          }`}
        >
          {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {isPositive ? "+" : ""}
          {change.toFixed(2)}%
        </span>
      </div>
    </div>
  );
}
