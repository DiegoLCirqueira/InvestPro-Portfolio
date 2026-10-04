import { useCurrencyHoldings } from "@/hooks/use-currency-holdings";
import { useFreeBalance } from "@/hooks/use-free-balance";

// Quanto dá pra usar em `currency`: BRL vem do saldo em conta LIVRE (sem o reservado em ordens
// abertas); as demais moedas, do saldo em moeda (CurrencyHolding). Mesma regra do servidor ao
// executar o câmbio — mostrar isso antes evita o "saldo insuficiente" surpresa.
export function useAvailableBalance(currency: string) {
  const account = useFreeBalance();
  const { holdings, isLoading, refetch: refetchHoldings } = useCurrencyHoldings();
  const isBrl = currency === "BRL";

  return {
    available: isBrl
      ? account.free
      : (holdings.find((holding) => holding.currency === currency)?.balance ?? 0),
    /** Só em BRL: reservado em ordens abertas (moeda estrangeira não é reservada por ordens). */
    reserved: isBrl ? account.reserved : 0,
    isLoading: account.isLoading || isLoading,
    refetch: async () => {
      await Promise.all([account.refetch(), refetchHoldings()]);
    },
  };
}
