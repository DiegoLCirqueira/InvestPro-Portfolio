// Espelho dos contratos de @investpro/shared (investor-profile e
// recommendations); o web não importa o shared.

export type InvestorProfileType = "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE";
export type AllocationType = "FIXED_INCOME" | "STOCK" | "CRYPTO" | "FOREIGN_CURRENCY";

export interface InvestorQuestion {
  id: string;
  title: string;
  options: Array<{ id: string; label: string }>;
}

export interface InvestorProfileDefinition {
  type: InvestorProfileType;
  label: string;
  description: string;
  targetAllocation: Record<AllocationType, number>;
}

export interface InvestorQuestionnaire {
  questions: InvestorQuestion[];
  profiles: InvestorProfileDefinition[];
}

export interface InvestorProfile {
  type: InvestorProfileType;
  score: number;
  answeredAt: string;
}

export interface InvestorProfileResponse {
  profile: InvestorProfile | null;
}

/** id da pergunta → id da opção escolhida. */
export type InvestorProfileAnswers = Record<string, string>;

export type RecommendationCategory = "PROFILE" | "DIVERSIFICATION" | "OPPORTUNITY" | "RISK" | "ALIGNED";

export interface AllocationComparison {
  type: AllocationType;
  label: string;
  currentPct: number;
  targetPct: number;
}

export interface PersonalizedRecommendation {
  id: string;
  category: RecommendationCategory;
  title: string;
  description: string;
}

export interface RecommendationsResponse {
  profile: InvestorProfileType | null;
  allocation: AllocationComparison[];
  items: PersonalizedRecommendation[];
}
