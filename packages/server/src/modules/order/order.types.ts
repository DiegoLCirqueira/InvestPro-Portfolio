// @investpro/server
// Tipos auxiliares do módulo de ordens (leitura de portfolio sem acoplamento).

export interface PortfolioPosition {
  id: string
  ticker: string
  name: string
  type: string
  quantity: number
  avgPrice: number
  currentValue: number
}

export interface IdGenerator {
  (): string
}
