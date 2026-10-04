import { create } from "zustand";
import type { BalanceShortfall } from "@/lib/balance-shortfall";

interface InsufficientBalanceState {
  isOpen: boolean;
  /** Código do erro da API: define qual saldo faltou (conta, Caixinha ou moeda). */
  code: string | null;
  /** Quanto custava e quanto havia em conta: o erro da API não traz o valor que falta. */
  shortfall: BalanceShortfall | null;
  open: (code?: string, shortfall?: BalanceShortfall) => void;
  close: () => void;
}

/**
 * Estado único e global: qualquer fluxo de saída de saldo (Transferências,
 * Câmbio, Caixinha, Ordens) chama open() em vez de abrir um dialog próprio —
 * como é um boolean único, nunca existem dois popups abertos ao mesmo tempo.
 */
export const useInsufficientBalanceStore = create<InsufficientBalanceState>()(
  (set) => ({
    isOpen: false,
    code: null,
    shortfall: null,
    open: (code, shortfall) =>
      set({ isOpen: true, code: code ?? null, shortfall: shortfall ?? null }),
    close: () => set({ isOpen: false }),
  }),
);
