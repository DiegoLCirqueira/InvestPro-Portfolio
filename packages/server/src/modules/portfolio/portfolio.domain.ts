export type AssetType = 'CRYPTO' | 'STOCK' | 'FIXED_INCOME'
// Moedas estrangeiras (câmbio) não são posição de ativo, mas são patrimônio:
// sem essa fatia, dinheiro trocado por dólar/euro some da diversificação.
export type DiversificationCategory = AssetType | 'FOREIGN_CURRENCY'

export const TYPE_LABELS: Record<DiversificationCategory, string> = {
  CRYPTO: 'Criptomoedas',
  STOCK: 'Ações',
  FIXED_INCOME: 'Renda fixa',
  FOREIGN_CURRENCY: 'Moedas estrangeiras',
}

export interface DiversificationPosition {
  type: DiversificationCategory
  currentValue: number
}

export interface DiversificationItem {
  type: DiversificationCategory
  label: string
  value: number
  percentage: number
  /** Só em FIXED_INCOME: quanto do valor é a Caixinha. */
  savingsBox?: number
}

export interface DiversificationResult {
  totalBalance: number
  breakdown: DiversificationItem[]
}

// A Caixinha rende % do CDI: é renda fixa. Fora da conta, quem guarda dinheiro
// nela via a renda fixa subestimada e recebia "aumente a renda fixa".
export function calculateDiversification(
  positions: ReadonlyArray<DiversificationPosition>,
  totalBalance: number,
  savingsBox = 0,
): DiversificationResult {
  const grouped: Partial<Record<DiversificationCategory, number>> = {}
  for (const pos of positions) {
    grouped[pos.type] = (grouped[pos.type] ?? 0) + pos.currentValue
  }
  if (savingsBox > 0) grouped.FIXED_INCOME = (grouped.FIXED_INCOME ?? 0) + savingsBox

  const breakdown = (Object.entries(grouped) as Array<[DiversificationCategory, number]>)
    .map(([type, value]) => ({
      type,
      label: TYPE_LABELS[type] ?? type,
      value,
      percentage: totalBalance > 0 ? Math.round((value / totalBalance) * 10000) / 100 : 0,
      ...(type === 'FIXED_INCOME' && savingsBox > 0 ? { savingsBox } : {}),
    }))
    .sort((a, b) => b.value - a.value)

  return { totalBalance, breakdown }
}