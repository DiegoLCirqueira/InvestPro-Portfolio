import {
  ALLOCATION_TYPES,
  INVESTOR_PROFILE_INFO,
  TARGET_ALLOCATION,
  type AllocationComparison,
  type AllocationType,
  type InvestorProfileType,
  type PersonalizedRecommendation,
} from '@investpro/shared'
import { TYPE_LABELS } from '../portfolio/portfolio.domain.js'

/** Diferença mínima (pontos percentuais) entre atual e referência para virar recomendação. */
export const DEVIATION_THRESHOLD_PP = 5
/** Saldo em conta a partir do qual vale sugerir investir o que está parado. */
const IDLE_CASH_MIN_AMOUNT = 1_000
const IDLE_CASH_MIN_SHARE = 0.2

const TEXT_LABELS: Record<AllocationType, string> = {
  FIXED_INCOME: 'renda fixa',
  STOCK: 'ações',
  CRYPTO: 'criptomoedas',
  FOREIGN_CURRENCY: 'moedas estrangeiras',
}

// Concordância do verbo: "renda fixa representa", mas "ações representam".
const SINGULAR_TYPES: ReadonlySet<AllocationType> = new Set(['FIXED_INCOME'])
const agree = (type: AllocationType, singular: string, plural: string) =>
  SINGULAR_TYPES.has(type) ? singular : plural

export interface RecommendationInput {
  profile: InvestorProfileType | null
  /** Valor investido por tipo (mesma base da Diversificação: posições + Caixinha em renda fixa + moedas, sem o caixa). */
  invested: ReadonlyArray<{ type: AllocationType; value: number }>
  /** Saldo em conta (caixa). */
  cash: number
  /** Patrimônio total (caixa + investimentos + caixinha + moedas). */
  equity: number
}

export interface RecommendationResult {
  allocation: AllocationComparison[]
  items: PersonalizedRecommendation[]
}

const formatBrl = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

const formatPct = (value: number) => `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`

const roundPct = (value: number) => Math.round(value * 10) / 10

function compareAllocation(
  profile: InvestorProfileType,
  invested: RecommendationInput['invested']
): AllocationComparison[] {
  const total = invested.reduce((sum, item) => sum + item.value, 0)
  return ALLOCATION_TYPES.map((type) => {
    const value = invested.filter((item) => item.type === type).reduce((sum, item) => sum + item.value, 0)
    return {
      type,
      label: TYPE_LABELS[type],
      currentPct: total > 0 ? roundPct((value / total) * 100) : 0,
      targetPct: TARGET_ALLOCATION[profile][type],
    }
  })
}

function describeTarget(profile: InvestorProfileType): string {
  return ALLOCATION_TYPES.filter((type) => TARGET_ALLOCATION[profile][type] > 0)
    .map((type) => `${TARGET_ALLOCATION[profile][type]}% em ${TEXT_LABELS[type]}`)
    .join(', ')
}

function idleCashRecommendation(input: RecommendationInput): PersonalizedRecommendation | null {
  if (input.cash < IDLE_CASH_MIN_AMOUNT || input.equity <= 0) return null
  const share = input.cash / input.equity
  if (share < IDLE_CASH_MIN_SHARE) return null
  return {
    id: 'idle-cash',
    category: 'OPPORTUNITY',
    title: 'Dinheiro parado em conta',
    description: `Você tem ${formatBrl(input.cash)} em conta (${formatPct(roundPct(share * 100))} do patrimônio) sem render. Considere levar parte para a Caixinha ou para investimentos alinhados ao seu perfil.`,
  }
}

function deviationRecommendations(
  profile: InvestorProfileType,
  allocation: AllocationComparison[]
): PersonalizedRecommendation[] {
  const profileLabel = INVESTOR_PROFILE_INFO[profile].label
  return allocation
    .map((item) => ({ ...item, diff: item.currentPct - item.targetPct }))
    .filter((item) => Math.abs(item.diff) >= DEVIATION_THRESHOLD_PP)
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    .map((item): PersonalizedRecommendation => {
      const label = TEXT_LABELS[item.type]
      const current = `Hoje ${label} ${agree(item.type, 'representa', 'representam')} ${formatPct(item.currentPct)} do que você tem investido`
      if (item.diff < 0) {
        return {
          id: `increase-${item.type}`,
          category: 'DIVERSIFICATION',
          title: `Aumentar a posição em ${label}`,
          description: `${current}; a referência para o perfil ${profileLabel} é ${formatPct(item.targetPct)}.`,
        }
      }
      return {
        id: `reduce-${item.type}`,
        category: 'RISK',
        title: `Reduzir a exposição a ${label}`,
        description:
          item.targetPct === 0
            ? `${current}, e ${label} não ${agree(item.type, 'faz', 'fazem')} parte da carteira de referência do perfil ${profileLabel}.`
            : `${current}, acima dos ${formatPct(item.targetPct)} de referência para o perfil ${profileLabel}.`,
      }
    })
}

/**
 * Sugestões determinísticas: compara a carteira com a de referência do perfil
 * de investidor. Sem perfil, a única sugestão de carteira é responder o
 * questionário.
 */
export function buildRecommendations(input: RecommendationInput): RecommendationResult {
  const idleCash = idleCashRecommendation(input)
  const extras = idleCash ? [idleCash] : []

  if (!input.profile) {
    return {
      allocation: [],
      items: [
        {
          id: 'take-questionnaire',
          category: 'PROFILE',
          title: 'Descubra seu perfil de investidor',
          description:
            'Responda 7 perguntas rápidas para receber sugestões de acordo com seus objetivos e sua tolerância a risco.',
        },
        ...extras,
      ],
    }
  }

  const profile = input.profile
  const profileLabel = INVESTOR_PROFILE_INFO[profile].label
  const allocation = compareAllocation(profile, input.invested)
  const totalInvested = input.invested.reduce((sum, item) => sum + item.value, 0)

  if (totalInvested <= 0) {
    return {
      allocation,
      items: [
        {
          id: 'start-investing',
          category: 'OPPORTUNITY',
          title: 'Comece pela carteira de referência',
          description: `Você ainda não tem investimentos. Para o perfil ${profileLabel}, a carteira de referência tem ${describeTarget(profile)}.`,
        },
        ...extras,
      ],
    }
  }

  const deviations = deviationRecommendations(profile, allocation)
  const aligned: PersonalizedRecommendation[] =
    deviations.length === 0
      ? [
          {
            id: 'aligned',
            category: 'ALIGNED',
            title: 'Carteira alinhada ao seu perfil',
            description: `Cada classe está a menos de ${DEVIATION_THRESHOLD_PP} pontos percentuais da referência do perfil ${profileLabel}.`,
          },
        ]
      : []

  return { allocation, items: [...deviations, ...extras, ...aligned] }
}
