import type { PersonalizedRecommendationsResponse } from '@investpro/shared'
import { getDiversification, getPortfolio } from '../portfolio/portfolio.service.js'
import { getInvestorProfile } from '../user/investor-profile.service.js'
import { buildRecommendations } from './recommendations.domain.js'

export async function getRecommendations(userId: string): Promise<PersonalizedRecommendationsResponse> {
  const [profile, portfolio, diversification] = await Promise.all([
    getInvestorProfile(userId),
    getPortfolio(userId),
    getDiversification(userId),
  ])

  const profileType = profile?.type ?? null
  const result = buildRecommendations({
    profile: profileType,
    invested: diversification.breakdown.map((item) => ({ type: item.type, value: item.value })),
    cash: portfolio.balance,
    equity: portfolio.totalEquity,
  })

  return { profile: profileType, ...result }
}
