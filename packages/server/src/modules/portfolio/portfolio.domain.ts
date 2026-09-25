export type AssetType = 'CRYPTO' | 'STOCK' | 'FIXED_INCOME'
// Moedas estrangeiras (câmbio) não são posição de ativo, mas são patrimônio:
// sem essa fatia, dinheiro trocado por dólar/euro some da diversificação.
export type DiversificationCategory = AssetType | 'FOREIGN_CURRENCY'

export const TYPE_LABELS: Record<DiversificationCategory, string> = {
  CRYPTO: 'Criptomoedas',
  STOCK: 'Ações',
  FIXED_INCOME: 'Renda Fixa',
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
}

export interface DiversificationResult {
  totalBalance: number
  breakdown: DiversificationItem[]
}

export function calculateDiversification(
  positions: ReadonlyArray<DiversificationPosition>,
  totalBalance: number,
): DiversificationResult {
  const grouped: Partial<Record<DiversificationCategory, number>> = {}
  for (const pos of positions) {
    grouped[pos.type] = (grouped[pos.type] ?? 0) + pos.currentValue
  }

  const breakdown = (Object.entries(grouped) as Array<[DiversificationCategory, number]>)
    .map(([type, value]) => ({
      type,
      label: TYPE_LABELS[type] ?? type,
      value,
      percentage: totalBalance > 0 ? Math.round((value / totalBalance) * 10000) / 100 : 0,
    }))
    .sort((a, b) => b.value - a.value)

  return { totalBalance, breakdown }
}