import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

// Explica por que o saldo disponível é menor que o Saldo em conta do Painel: parte dele está
// prometida a ordens abertas. Sem reserva, não ocupa espaço.
export function ReservedBalanceNote({
  reserved,
  className,
}: {
  reserved: number;
  className?: string;
}) {
  if (reserved <= 0) return null;
  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      Reservado em ordens abertas:{" "}
      <span className="font-semibold tabular-nums text-foreground">{formatCurrency(reserved)}</span>
    </p>
  );
}
