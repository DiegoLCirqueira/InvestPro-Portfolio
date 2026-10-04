import type { DiversificationCategory } from "@/types/portfolio";

/** Cor de cada classe de ativo (tokens do tema), igual na Diversificação, no perfil e nas recomendações. */
export const CATEGORY_COLORS: Record<DiversificationCategory, string> = {
  CRYPTO: "var(--color-cat-crypto)",
  STOCK: "var(--color-cat-stocks)",
  FIXED_INCOME: "var(--color-cat-fixed)",
  FOREIGN_CURRENCY: "var(--color-cat-intl)",
};

/**
 * Nome de cada classe na tela. O site usa estes, e não o label que vem da API: assim a grafia é
 * uma só (ex.: "Renda fixa", como no filtro do Mercado) mesmo que o servidor escreva diferente.
 */
export const CATEGORY_LABELS: Record<DiversificationCategory, string> = {
  FIXED_INCOME: "Renda fixa",
  STOCK: "Ações",
  CRYPTO: "Criptomoedas",
  FOREIGN_CURRENCY: "Moedas estrangeiras",
};

/** Ordem das classes na carteira de referência (rótulos de CATEGORY_LABELS). */
export const ALLOCATION_LABELS: ReadonlyArray<{ type: DiversificationCategory; label: string }> = (
  ["FIXED_INCOME", "STOCK", "CRYPTO", "FOREIGN_CURRENCY"] as const
).map((type) => ({ type, label: CATEGORY_LABELS[type] }));
