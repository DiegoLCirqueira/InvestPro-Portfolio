import { Coins } from "lucide-react";
import { SectionTitle } from "@/components/SectionTitle";
import { EmptyState } from "@/components/EmptyState";
import { useCurrencyHoldings, type CurrencyHolding } from "@/hooks/use-currency-holdings";
import { currencyName } from "@/lib/currency";
import { formatCurrency } from "@/lib/format";
import { cardClassName } from "@/components/ui/card";

function CurrencyHoldingRow({ holding }: { holding: CurrencyHolding }) {
  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="font-mono font-bold text-sm text-foreground w-10">
          {holding.currency}
        </span>
        <span className="text-xs text-muted-foreground truncate">
          {currencyName(holding.currency)}
        </span>
      </div>
      <span className="font-bold text-foreground tabular-nums">
        {formatCurrency(holding.balance, holding.currency)}
      </span>
    </li>
  );
}

function CurrencyHoldingsBody() {
  const { holdings, isLoading, error, refetch } = useCurrencyHoldings();

  if (isLoading) {
    return <div className="h-24 rounded-xl bg-secondary/50 animate-pulse" />;
  }

  if (error) {
    return (
      <EmptyState
        icon={Coins}
        message={`Não foi possível carregar suas moedas: ${error.message}`}
        action={{ label: "Tentar novamente", onClick: () => void refetch() }}
        className="py-8"
      />
    );
  }

  if (holdings.length === 0) {
    return (
      <EmptyState
        icon={Coins}
        message="Você ainda não possui saldo em outras moedas. Converta parte do seu saldo no Câmbio para vê-lo aqui."
        action={{ label: "Ir para o Câmbio", to: "/exchange" }}
        className="py-8"
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {holdings.map((holding) => (
        <CurrencyHoldingRow key={holding.currency} holding={holding} />
      ))}
    </ul>
  );
}

export function CurrencyHoldingsCard() {
  return (
    <section
      aria-labelledby="currency-holdings-title"
      className={cardClassName}
    >
      <SectionTitle id="currency-holdings-title" className="mb-1">
        Moedas
      </SectionTitle>
      <p className="text-xs text-muted-foreground mb-2">
        Saldo de cada moeda que você obteve pelo Câmbio.
      </p>
      <CurrencyHoldingsBody />
    </section>
  );
}
