import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ListOrdered,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { SectionTitle } from "@/components/SectionTitle";
import { Button } from "@/components/ui/button";
import { cardClassName } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { SavingsBoxTransactionsState } from "@/hooks/use-savings-box";
import { formatCurrency, formatDateTimeMinutes } from "@/lib/format";
import { SAVINGS_BOX_TRANSACTIONS_SINCE } from "@/lib/savings-box";
import { cn } from "@/lib/utils";
import type { SavingsBoxTransaction, SavingsBoxTransactionType } from "@/types/savings-box";

const TYPE_CONFIG: Record<SavingsBoxTransactionType, { label: string; icon: LucideIcon }> = {
  DEPOSIT: { label: "Depósito", icon: ArrowDownToLine },
  WITHDRAW: { label: "Resgate", icon: ArrowUpFromLine },
  ORDER_FUNDING: { label: "Usado numa compra", icon: ShoppingCart },
};

function TransactionRow({ transaction }: { transaction: SavingsBoxTransaction }) {
  const { label, icon: Icon } = TYPE_CONFIG[transaction.type];
  const isDeposit = transaction.type === "DEPOSIT";

  return (
    <li className="flex items-center gap-3 py-3">
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground"
        aria-hidden="true"
      >
        <Icon size={16} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="font-semibold">{label}</span>
        <span className="text-xs text-muted-foreground">
          {formatDateTimeMinutes(transaction.createdAt)}
        </span>
      </div>
      <div className="flex flex-col items-end">
        {/* Sinal em texto (não só na cor): entrada "+", saída "−". */}
        <span
          className={cn(
            "font-semibold tabular-nums",
            isDeposit ? "text-primary" : "text-foreground",
          )}
        >
          {isDeposit ? "+" : "−"}
          {formatCurrency(transaction.amount)}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          Saldo: {formatCurrency(transaction.balanceAfter)}
        </span>
      </div>
    </li>
  );
}

interface SavingsBoxTransactionsProps {
  transactions: SavingsBoxTransactionsState;
  /** Saldo na Caixinha: com dinheiro guardado e extrato vazio, o dinheiro é de antes do extrato. */
  savingsBalance: number;
}

/** [D] Movimentações: extrato da Caixinha, 10 por vez com "Ver mais". */
export function SavingsBoxTransactions({
  transactions,
  savingsBalance,
}: SavingsBoxTransactionsProps) {
  const { items, isLoading, error, hasMore, isLoadingMore, loadMoreError } = transactions;

  return (
    <section
      aria-labelledby="caixinha-movimentacoes"
      aria-busy={isLoading || isLoadingMore}
      className={cn(cardClassName, "nav:col-span-5 flex flex-col gap-2")}
    >
      <SectionTitle id="caixinha-movimentacoes">Movimentações</SectionTitle>

      {isLoading ? (
        <div className="flex flex-col gap-3 py-3">
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-10 w-full" />
          ))}
        </div>
      ) : error ? (
        // Só este bloco falha: o resto da página (saldos, simulador) continua utilizável.
        <ErrorState
          title="Não foi possível carregar as movimentações"
          message={error.message}
          onRetry={() => void transactions.refetch()}
          bordered={false}
          className="py-6"
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={ListOrdered}
          message={
            savingsBalance > 0
              ? `As movimentações são registradas a partir de ${SAVINGS_BOX_TRANSACTIONS_SINCE}.`
              : "Seus depósitos e resgates aparecem aqui."
          }
          className="py-6"
        />
      ) : (
        <>
          <ul className="flex flex-col divide-y divide-border">
            {items.map((transaction) => (
              <TransactionRow key={transaction.id} transaction={transaction} />
            ))}
          </ul>
          {loadMoreError && (
            <p role="alert" className="text-sm text-destructive">
              Não foi possível carregar mais movimentações. Tente de novo.
            </p>
          )}
          {hasMore && (
            <Button
              variant="outline"
              className="self-center"
              onClick={() => void transactions.loadMore()}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? "Carregando..." : "Ver mais"}
            </Button>
          )}
        </>
      )}
    </section>
  );
}
