import { create } from "zustand";

interface InsufficientBalanceState {
  isOpen: boolean;
  /** Código do erro da API: define qual saldo faltou (conta, caixinha ou moeda). */
  code: string | null;
  open: (code?: string) => void;
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
    open: (code) => set({ isOpen: true, code: code ?? null }),
    close: () => set({ isOpen: false }),
  }),
);
