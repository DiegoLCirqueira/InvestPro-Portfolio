// @investpro/shared
// Recomendações personalizadas: comparam a carteira atual com a carteira de
// referência do perfil de investidor. Regras determinísticas, sem LLM.

import { z } from 'zod';
import { ALLOCATION_TYPES, INVESTOR_PROFILES } from '../investor-profile/investor-profile.js';

export const RECOMMENDATION_CATEGORIES = ['PROFILE', 'DIVERSIFICATION', 'OPPORTUNITY', 'RISK', 'ALIGNED'] as const;
export type RecommendationCategory = (typeof RECOMMENDATION_CATEGORIES)[number];

export const allocationComparisonSchema = z.object({
  type: z.enum(ALLOCATION_TYPES),
  label: z.string(),
  currentPct: z.number(),
  targetPct: z.number(),
});

export const personalizedRecommendationSchema = z.object({
  id: z.string(),
  category: z.enum(RECOMMENDATION_CATEGORIES),
  title: z.string(),
  description: z.string(),
});

export const personalizedRecommendationsResponseSchema = z.object({
  profile: z.enum(INVESTOR_PROFILES).nullable(),
  allocation: z.array(allocationComparisonSchema),
  items: z.array(personalizedRecommendationSchema),
});

export type AllocationComparison = z.infer<typeof allocationComparisonSchema>;
export type PersonalizedRecommendation = z.infer<typeof personalizedRecommendationSchema>;
export type PersonalizedRecommendationsResponse = z.infer<typeof personalizedRecommendationsResponseSchema>;
