// @investpro/shared
// Camada de contrato compartilhada entre web e server.
// Schemas Zod canônicos (Fase B/C) + tipos inferidos + client de rede.

export const INVESTPRO_VERSION = '0.0.0';

export * from './types/common.js';
export * from './types/enums.js';
export * from './types/user.js';
export * from './client/apiClient.js';

export * from './auth/auth.schema.js';
export * from './user/user.schema.js';
export * from './portfolio/portfolio.schema.js';
export * from './market/market.schema.js';
export * from './order/order.schema.js';
export * from './exchange/exchange.schema.js';
export * from './transfer/transfer.schema.js';
export * from './news/news.schema.js';
export * from './risk/risk.schema.js';
export * from './ai/ai.schema.js';