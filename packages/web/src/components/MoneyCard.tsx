import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cardClassName } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface MoneyCardProps {
  id?: string;
  icon: LucideIcon;
  label: string;
  value: number;
  /** Ex.: a Caixinha mostra o valor guardado em verde. */
  valueClassName?: string;
  description: ReactNode;
  /** Linha das ações (botões). */
  children: ReactNode;
}

// "Lugar do dinheiro" no Painel (Saldo em conta, Caixinha): rótulo, valor, descrição e ações.
// Lado a lado, cada card ocupa 4 linhas da grade do pai (subgrid): descrições de tamanhos
// diferentes não desalinham valores nem botões. Empilhados (celular), cada um tem a sua grade.
export function MoneyCard({
  id,
  icon: Icon,
  label,
  value,
  valueClassName,
  description,
  children,
}: MoneyCardProps) {
  return (
    <section
      id={id}
      aria-label={label}
      className={cn(
        cardClassName,
        "grid scroll-mt-4 grid-rows-[auto_auto_auto_auto] gap-y-1.5 sm:row-span-4 sm:grid-rows-subgrid",
      )}
    >
      <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Icon size={16} aria-hidden="true" />
        {label}
      </p>
      <h3
        className={cn(
          "whitespace-nowrap text-3xl font-bold tracking-tight tabular-nums text-foreground",
          valueClassName,
        )}
      >
        {formatCurrency(value)}
      </h3>
      <p className="text-xs text-muted-foreground">{description}</p>
      <div className="mt-2">{children}</div>
    </section>
  );
}
