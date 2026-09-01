// @investpro/shared
// Contratos da camada de IA/Recomendações.
// Baseado em REGRAS DETERMINÍSTICAS (decisão v1.1) — não usa LLM.

import { z } from 'zod';
import { AI_ACTIONS } from '../types/enums.js';

export const recommendationSchema = z.object({
  id: z.string().optional(),
  assetId: z.string().optional(),
  ticker: z.string(),
  action: z.enum(AI_ACTIONS),
  confidence: z.number().min(0).max(1).optional(),
  reason: z.string(),
  score: z.number().min(0).max(100).optional(),
  createdAt: z.string().optional(),
});

export const aiQuerySchema = z.object({
  ticker: z.string().max(100).optional(),
  limit: z.number().int().positive().max(50).default(10),
});

export const recommendationListSchema = z.object({
  items: z.array(recommendationSchema),
  generatedAt: z.string(),
});

export type Recommendation = z.infer<typeof recommendationSchema>;
export type AIQuery = z.infer<typeof aiQuerySchema>;
export type RecommendationList = z.infer<typeof recommendationListSchema>;