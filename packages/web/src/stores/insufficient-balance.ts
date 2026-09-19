import { create } from "zustand";

interface InsufficientBalanceState {
  isOpen: boolean;
  open: () => void;
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
    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),
  }),
);
