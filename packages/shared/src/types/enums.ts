// @investpro/shared
// Enums centralizados do domínio, reutilizados pelos schemas Zod.

/** Papéis de usuário. */
export const USER_ROLES = ['USER', 'ADMIN'] as const;

/** Tipos de ativo negociáveis. */
export const ASSET_TYPES = ['CRYPTO', 'STOCK', 'FIXED_INCOME'] as const;

/** Períodos disponíveis para histórico de portfólio. */
export const PORTFOLIO_PERIODS = ['7d', '30d', '90d', '1y'] as const;

/** Lados de uma ordem. */
export const ORDER_SIDES = ['BUY', 'SELL'] as const;

/** Tipos de ordem. */
export const ORDER_TYPES = ['MARKET', 'LIMIT', 'STOP'] as const;

/** Estados de vida de uma ordem. */
export const ORDER_STATUSES = [
  'PENDING',
  'OPEN',
  'PARTIALLY_FILLED',
  'FILLED',
  'CANCELLED',
  'REJECTED',
] as const;

/** Modalidades de transferência bancária. */
export const TRANSFER_TYPES = ['PIX', 'TED', 'DOC'] as const;

/** Estados de vida de uma transferência. */
export const TRANSFER_STATUSES = ['PENDING', 'COMPLETED', 'FAILED'] as const;

/** Moedas suportadas no câmbio. */
export const CURRENCIES = [
  'BRL',
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'CHF',
  'CAD',
  'AUD',
  'CNY',
] as const;

/** Categorias de notícias. */
export const NEWS_CATEGORIES = [
  'MARKET',
  'MACRO',
  'CRYPTO',
  'COMPANIES',
  'ECONOMY',
  'WORLD',
] as const;

/** Ações recomendadas pela IA (regras determinísticas). */
export const AI_ACTIONS = ['BUY', 'HOLD', 'SELL'] as const;