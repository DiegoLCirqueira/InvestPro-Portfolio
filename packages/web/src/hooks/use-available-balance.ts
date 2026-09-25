import { useCurrencyHoldings } from "@/hooks/use-currency-holdings";
import { usePortfolioPositions } from "@/hooks/usePortfolio";

// Quanto dá pra usar em `currency`: BRL vem do caixa do portfólio; as demais
// moedas, do saldo em moeda (CurrencyHolding). Mesma regra do servidor ao
// executar o câmbio — mostrar isso antes evita o "saldo insuficiente" surpresa.
export function useAvailableBalance(currency: string) {
  const portfolio = usePortfolioPositions();
  const { holdings, isLoading, refetch: refetchHoldings } = useCurrencyHoldings();

  const available =
    currency === "BRL"
      ? portfolio.balance
      : (holdings.find((holding) => holding.currency === currency)?.balance ?? 0);

  return {
    available,
    isLoading: portfolio.isLoading || isLoading,
    refetch: async () => {
      await Promise.all([portfolio.refetch(), refetchHoldings()]);
    },
  };
}
