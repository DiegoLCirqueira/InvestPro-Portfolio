import {
  profileForScore,
  scoreInvestorAnswers,
  type InvestorProfile,
  type InvestorProfileAnswers,
} from '@investpro/shared'
import { prisma } from '../../config/database.js'
import { AppError } from '../auth/auth.service.js'

const profileSelect = { investorProfile: true, investorProfileScore: true, investorProfileAt: true } as const

type StoredProfile = {
  investorProfile: InvestorProfile['type'] | null
  investorProfileScore: number | null
  investorProfileAt: Date | null
}

function toInvestorProfile(user: StoredProfile): InvestorProfile | null {
  if (!user.investorProfile || user.investorProfileScore === null || !user.investorProfileAt) return null
  return {
    type: user.investorProfile,
    score: user.investorProfileScore,
    answeredAt: user.investorProfileAt.toISOString(),
  }
}

export async function getInvestorProfile(userId: string): Promise<InvestorProfile | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: profileSelect })
  if (!user) throw new AppError('USER_NOT_FOUND', 'Usuário não encontrado', 404)
  return toInvestorProfile(user)
}

// O perfil é sempre recalculado aqui a partir das respostas: o cliente nunca
// informa o resultado. Refazer o questionário sobrescreve o anterior.
export async function saveInvestorProfile(
  userId: string,
  answers: InvestorProfileAnswers
): Promise<InvestorProfile> {
  const score = scoreInvestorAnswers(answers)
  const user = await prisma.user.update({
    where: { id: userId },
    data: { investorProfile: profileForScore(score), investorProfileScore: score, investorProfileAt: new Date() },
    select: profileSelect,
  })
  return toInvestorProfile(user)!
}
