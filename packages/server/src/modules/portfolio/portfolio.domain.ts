export type AssetType = 'CRYPTO' | 'STOCK' | 'FIXED_INCOME'

export const TYPE_LABELS: Record<AssetType, string> = {
  CRYPTO: 'Criptomoedas',
  STOCK: 'Ações',
  FIXED_INCOME: 'Renda Fixa',
}

export interface DiversificationPosition {
  type: AssetType
  currentValue: number
}

export interface DiversificationItem {
  type: AssetType
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
  const grouped: Partial<Record<AssetType, number>> = {}
  for (const pos of positions) {
    grouped[pos.type] = (grouped[pos.type] ?? 0) + pos.currentValue
  }

  const breakdown = (Object.entries(grouped) as Array<[AssetType, number]>)
    .map(([type, value]) => ({
      type,
      label: TYPE_LABELS[type] ?? type,
      value,
      percentage: totalBalance > 0 ? Math.round((value / totalBalance) * 10000) / 100 : 0,
    }))
    .sort((a, b) => b.value - a.value)

  return { totalBalance, breakdown }
}