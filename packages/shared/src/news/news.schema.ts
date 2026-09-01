// @investpro/shared
// Contratos de notícias do mercado financeiro. Base para WI-215.

import { z } from 'zod';
import { NEWS_CATEGORIES } from '../types/enums.js';

export const newsItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  source: z.string(),
  category: z.enum(NEWS_CATEGORIES),
  url: z.string().url(),
  publishedAt: z.string(),
});

export const newsQuerySchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  category: z.enum(NEWS_CATEGORIES).optional(),
});

export const newsListSchema = z.object({
  items: z.array(newsItemSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
});

export type NewsItem = z.infer<typeof newsItemSchema>;
export type NewsQuery = z.infer<typeof newsQuerySchema>;
export type NewsList = z.infer<typeof newsListSchema>;