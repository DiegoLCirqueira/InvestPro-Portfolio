import type { DiversificationCategory } from "@/types/portfolio";

/** Cor de cada classe de ativo (tokens do tema), igual na Diversificação, no perfil e nas recomendações. */
export const CATEGORY_COLORS: Record<DiversificationCategory, string> = {
  CRYPTO: "var(--color-cat-crypto)",
  STOCK: "var(--color-cat-stocks)",
  FIXED_INCOME: "var(--color-cat-fixed)",
  FOREIGN_CURRENCY: "var(--color-cat-intl)",
};

/** Ordem e rótulos das classes na carteira de referência (mesmos rótulos da Diversificação). */
export const ALLOCATION_LABELS: ReadonlyArray<{ type: DiversificationCategory; label: string }> = [
  { type: "FIXED_INCOME", label: "Renda Fixa" },
  { type: "STOCK", label: "Ações" },
  { type: "CRYPTO", label: "Criptomoedas" },
  { type: "FOREIGN_CURRENCY", label: "Moedas estrangeiras" },
];
