import { useOrderReservations } from "@/hooks/use-orders";
import { usePortfolioPositions } from "@/hooks/usePortfolio";

/**
 * Saldo em conta LIVRE: o saldo menos o que as ordens abertas já reservaram. É o que vale para
 * comprar, depositar na Caixinha, converter de BRL e transferir (o servidor confere o mesmo).
 */
export function useFreeBalance() {
  const portfolio = usePortfolioPositions();
  const reservations = useOrderReservations();
  const reserved = reservations.balance;

  return {
    /** Carregou o saldo em conta (a reserva sem resposta conta como zero; o servidor protege). */
    isLoaded: portfolio.data !== undefined,
    free: Math.max(0, portfolio.balance - reserved),
    reserved,
    reservedPositions: reservations.positions,
    isLoading: portfolio.isLoading,
    error: portfolio.error,
    refetch: async () => {
      await Promise.all([portfolio.refetch(), reservations.refetch()]);
    },
  };
}
