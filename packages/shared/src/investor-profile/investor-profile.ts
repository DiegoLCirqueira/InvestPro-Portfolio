// @investpro/shared
// Questionário de perfil de investidor (suitability simplificado, de
// demonstração). Fica no shared porque o web mostra as perguntas e o server
// recalcula a pontuação a partir das respostas: o cliente nunca manda o perfil.

import { z } from 'zod';

export const INVESTOR_PROFILES = ['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE'] as const;
export type InvestorProfileType = (typeof INVESTOR_PROFILES)[number];

export interface InvestorQuestionOption {
  id: string;
  label: string;
  points: number;
}

export interface InvestorQuestion {
  id: string;
  title: string;
  options: readonly InvestorQuestionOption[];
}

export const INVESTOR_QUESTIONS: readonly InvestorQuestion[] = [
  {
    id: 'goal',
    title: 'Qual é o seu principal objetivo ao investir?',
    options: [
      { id: 'preserve', label: 'Preservar o que já tenho', points: 1 },
      { id: 'income', label: 'Complementar a renda com segurança', points: 2 },
      { id: 'grow', label: 'Fazer o patrimônio crescer, aceitando oscilações', points: 3 },
      { id: 'maximize', label: 'Buscar o maior retorno possível, mesmo com risco alto', points: 4 },
    ],
  },
  {
    id: 'horizon',
    title: 'Por quanto tempo pretende deixar o dinheiro investido?',
    options: [
      { id: 'under-1y', label: 'Menos de 1 ano', points: 1 },
      { id: '1-3y', label: 'De 1 a 3 anos', points: 2 },
      { id: '3-5y', label: 'De 3 a 5 anos', points: 3 },
      { id: 'over-5y', label: 'Mais de 5 anos', points: 4 },
    ],
  },
  {
    id: 'knowledge',
    title: 'Como você descreve sua experiência com investimentos?',
    options: [
      { id: 'none', label: 'Nunca investi ou só uso a poupança', points: 1 },
      { id: 'fixed-income', label: 'Conheço renda fixa (CDB, Tesouro)', points: 2 },
      { id: 'funds-stocks', label: 'Já investi em fundos ou ações', points: 3 },
      { id: 'advanced', label: 'Invisto com frequência em ações, cripto ou derivativos', points: 4 },
    ],
  },
  {
    id: 'drawdown',
    title: 'Seus investimentos caíram 20% em um mês. O que você faz?',
    options: [
      { id: 'sell-all', label: 'Vendo tudo para não perder mais', points: 1 },
      { id: 'sell-some', label: 'Vendo uma parte', points: 2 },
      { id: 'hold', label: 'Mantenho e espero recuperar', points: 3 },
      { id: 'buy-more', label: 'Aproveito para comprar mais', points: 4 },
    ],
  },
  {
    id: 'savings-rate',
    title: 'Quanto da sua renda mensal sobra para investir?',
    options: [
      { id: 'nothing', label: 'Quase nada', points: 1 },
      { id: 'up-to-10', label: 'Até 10%', points: 2 },
      { id: '10-30', label: 'De 10% a 30%', points: 3 },
      { id: 'over-30', label: 'Mais de 30%', points: 4 },
    ],
  },
  {
    id: 'emergency-fund',
    title: 'Você tem uma reserva de emergência?',
    options: [
      { id: 'none', label: 'Não tenho', points: 1 },
      { id: 'under-3m', label: 'Sim, para menos de 3 meses de gastos', points: 2 },
      { id: '3-6m', label: 'Sim, para 3 a 6 meses de gastos', points: 3 },
      { id: 'over-6m', label: 'Sim, para mais de 6 meses de gastos', points: 4 },
    ],
  },
  {
    id: 'risk-return',
    title: 'Qual cenário de um ano você prefere?',
    options: [
      { id: 'no-loss', label: 'Ganhar até 8%, sem chance de perda', points: 1 },
      { id: 'small-loss', label: 'Ganhar até 12%, podendo perder até 5%', points: 2 },
      { id: 'medium-loss', label: 'Ganhar até 20%, podendo perder até 15%', points: 3 },
      { id: 'large-loss', label: 'Ganhar até 40%, podendo perder até 30%', points: 4 },
    ],
  },
];

/** Pontuação máxima para cada faixa (inclusive); acima da última, AGGRESSIVE. */
const PROFILE_THRESHOLDS: ReadonlyArray<{ maxScore: number; profile: InvestorProfileType }> = [
  { maxScore: 14, profile: 'CONSERVATIVE' },
  { maxScore: 22, profile: 'MODERATE' },
];

export const INVESTOR_PROFILE_INFO: Record<InvestorProfileType, { label: string; description: string }> = {
  CONSERVATIVE: {
    label: 'Conservador',
    description:
      'Prioriza segurança e liquidez. Aceita retornos menores para evitar perdas, com a maior parte em renda fixa.',
  },
  MODERATE: {
    label: 'Moderado',
    description:
      'Busca equilíbrio: aceita alguma oscilação em troca de retorno maior, combinando renda fixa e renda variável.',
  },
  AGGRESSIVE: {
    label: 'Arrojado',
    description:
      'Foco em crescimento no longo prazo. Tolera quedas fortes no caminho, com peso maior em ações e cripto.',
  },
};

/**
 * Tipos de alocação: os mesmos da Diversificação (posições por tipo + moedas
 * estrangeiras), para a comparação "atual x referência" usar a mesma base.
 */
export const ALLOCATION_TYPES = ['FIXED_INCOME', 'STOCK', 'CRYPTO', 'FOREIGN_CURRENCY'] as const;
export type AllocationType = (typeof ALLOCATION_TYPES)[number];

/** Carteira de referência por perfil, em % do total investido (soma 100). */
export const TARGET_ALLOCATION: Record<InvestorProfileType, Record<AllocationType, number>> = {
  CONSERVATIVE: { FIXED_INCOME: 75, STOCK: 15, CRYPTO: 0, FOREIGN_CURRENCY: 10 },
  MODERATE: { FIXED_INCOME: 45, STOCK: 35, CRYPTO: 10, FOREIGN_CURRENCY: 10 },
  AGGRESSIVE: { FIXED_INCOME: 20, STOCK: 50, CRYPTO: 20, FOREIGN_CURRENCY: 10 },
};

/** Respostas: id da pergunta → id da opção escolhida. Exige todas as perguntas, sem extras. */
export const investorProfileAnswersSchema = z
  .record(z.string(), z.string())
  .refine(
    (answers) =>
      Object.keys(answers).length === INVESTOR_QUESTIONS.length &&
      INVESTOR_QUESTIONS.every((question) =>
        question.options.some((option) => option.id === answers[question.id])
      ),
    { message: 'Responda todas as perguntas do questionário' }
  );

export type InvestorProfileAnswers = z.infer<typeof investorProfileAnswersSchema>;

export const saveInvestorProfileBodySchema = z.object({ answers: investorProfileAnswersSchema }).strict();

export const investorProfileSchema = z.object({
  type: z.enum(INVESTOR_PROFILES),
  score: z.number().int(),
  answeredAt: z.string(),
});

export const investorProfileResponseSchema = z.object({
  profile: investorProfileSchema.nullable(),
});

export type InvestorProfile = z.infer<typeof investorProfileSchema>;

/** Soma dos pontos das respostas (as respostas já validadas pelo schema). */
export function scoreInvestorAnswers(answers: InvestorProfileAnswers): number {
  return INVESTOR_QUESTIONS.reduce((total, question) => {
    const option = question.options.find((candidate) => candidate.id === answers[question.id]);
    return total + (option?.points ?? 0);
  }, 0);
}

export function profileForScore(score: number): InvestorProfileType {
  return PROFILE_THRESHOLDS.find((threshold) => score <= threshold.maxScore)?.profile ?? 'AGGRESSIVE';
}

/** Questionário como o cliente vê: sem os pontos de cada opção. */
export const investorQuestionnaireResponseSchema = z.object({
  questions: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      options: z.array(z.object({ id: z.string(), label: z.string() })),
    })
  ),
  profiles: z.array(
    z.object({
      type: z.enum(INVESTOR_PROFILES),
      label: z.string(),
      description: z.string(),
      targetAllocation: z.record(z.enum(ALLOCATION_TYPES), z.number()),
    })
  ),
});

export type InvestorQuestionnaireResponse = z.infer<typeof investorQuestionnaireResponseSchema>;

export function investorQuestionnaire(): InvestorQuestionnaireResponse {
  return {
    questions: INVESTOR_QUESTIONS.map((question) => ({
      id: question.id,
      title: question.title,
      options: question.options.map(({ id, label }) => ({ id, label })),
    })),
    profiles: INVESTOR_PROFILES.map((type) => ({
      type,
      ...INVESTOR_PROFILE_INFO[type],
      targetAllocation: TARGET_ALLOCATION[type],
    })),
  };
}
