import { describe, expect, it } from 'vitest'
import { TARGET_ALLOCATION, profileForScore, scoreInvestorAnswers, INVESTOR_QUESTIONS } from '@investpro/shared'
import { buildRecommendations } from '../recommendations.domain.js'

const answerAll = (optionIndex: number) =>
  Object.fromEntries(INVESTOR_QUESTIONS.map((question) => [question.id, question.options[optionIndex].id]))

describe('pontuação do questionário', () => {
  it('respostas mais cautelosas dão Conservador, as do meio Moderado e as mais ousadas Arrojado', () => {
    expect(profileForScore(scoreInvestorAnswers(answerAll(0)))).toBe('CONSERVATIVE')
    expect(profileForScore(scoreInvestorAnswers(answerAll(1)))).toBe('CONSERVATIVE')
    expect(profileForScore(scoreInvestorAnswers(answerAll(2)))).toBe('MODERATE')
    expect(profileForScore(scoreInvestorAnswers(answerAll(3)))).toBe('AGGRESSIVE')
  })

  it('limites das faixas: 14 Conservador, 15 Moderado, 22 Moderado, 23 Arrojado', () => {
    expect(profileForScore(14)).toBe('CONSERVATIVE')
    expect(profileForScore(15)).toBe('MODERATE')
    expect(profileForScore(22)).toBe('MODERATE')
    expect(profileForScore(23)).toBe('AGGRESSIVE')
  })

  it('as carteiras de referência somam 100%', () => {
    for (const allocation of Object.values(TARGET_ALLOCATION)) {
      expect(Object.values(allocation).reduce((sum, pct) => sum + pct, 0)).toBe(100)
    }
  })
})

describe('buildRecommendations', () => {
  it('sem perfil: sugere responder o questionário e não compara carteira', () => {
    const result = buildRecommendations({ profile: null, invested: [], cash: 100, equity: 100 })
    expect(result.allocation).toEqual([])
    expect(result.items.map((item) => item.id)).toEqual(['take-questionnaire'])
  })

  it('com perfil e nada investido: apresenta a carteira de referência e aponta o dinheiro parado', () => {
    const result = buildRecommendations({ profile: 'MODERATE', invested: [], cash: 10_000, equity: 10_000 })
    expect(result.items.map((item) => item.id)).toEqual(['start-investing', 'idle-cash'])
    expect(result.items[0].description).toContain('45% em renda fixa')
    expect(result.allocation.every((item) => item.currentPct === 0)).toBe(true)
  })

  it('compara atual x referência e ordena os desvios do maior para o menor', () => {
    // Conservador 100% em ações: ações +85 pp, renda fixa -75 pp, moedas -10 pp.
    const result = buildRecommendations({
      profile: 'CONSERVATIVE',
      invested: [{ type: 'STOCK', value: 5_000 }],
      cash: 0,
      equity: 5_000,
    })
    expect(result.allocation.find((item) => item.type === 'STOCK')).toMatchObject({ currentPct: 100, targetPct: 15 })
    expect(result.items.map((item) => item.id)).toEqual([
      'reduce-STOCK',
      'increase-FIXED_INCOME',
      'increase-FOREIGN_CURRENCY',
    ])
    expect(result.items[0].category).toBe('RISK')
    expect(result.items[1].category).toBe('DIVERSIFICATION')
    // Concordância: "renda fixa" no singular, "ações"/"moedas estrangeiras" no plural.
    expect(result.items[0].description).toContain('Hoje ações representam 100%')
    expect(result.items[1].description).toContain('Hoje renda fixa representa 0%')
    expect(result.items[2].description).toContain('Hoje moedas estrangeiras representam 0%')
  })

  it('cripto numa carteira conservadora: explica que não faz parte da referência', () => {
    const result = buildRecommendations({
      profile: 'CONSERVATIVE',
      invested: [
        { type: 'FIXED_INCOME', value: 6_500 },
        { type: 'STOCK', value: 1_500 },
        { type: 'FOREIGN_CURRENCY', value: 1_000 },
        { type: 'CRYPTO', value: 1_000 },
      ],
      cash: 0,
      equity: 10_000,
    })
    const crypto = result.items.find((item) => item.id === 'reduce-CRYPTO')
    expect(crypto?.description).toContain('não fazem parte da carteira de referência')
  })

  it('desvios abaixo de 5 pp não viram sugestão: carteira alinhada', () => {
    const result = buildRecommendations({
      profile: 'AGGRESSIVE',
      invested: [
        { type: 'FIXED_INCOME', value: 2_200 },
        { type: 'STOCK', value: 4_800 },
        { type: 'CRYPTO', value: 2_000 },
        { type: 'FOREIGN_CURRENCY', value: 1_000 },
      ],
      cash: 500,
      equity: 10_500,
    })
    expect(result.items.map((item) => item.id)).toEqual(['aligned'])
  })

  it('dinheiro parado só entra com saldo relevante (>= R$ 1.000 e >= 20% do patrimônio)', () => {
    const base = { profile: null, invested: [] } as const
    expect(buildRecommendations({ ...base, cash: 999, equity: 999 }).items.map((item) => item.id)).not.toContain('idle-cash')
    expect(buildRecommendations({ ...base, cash: 1_000, equity: 10_000 }).items.map((item) => item.id)).not.toContain('idle-cash')
    expect(buildRecommendations({ ...base, cash: 2_000, equity: 10_000 }).items.map((item) => item.id)).toContain('idle-cash')
  })
})
