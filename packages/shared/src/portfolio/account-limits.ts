// @investpro/shared
// Regras de saldo simulado da demonstração.

/** Saldo com que toda conta nova começa (não conta no limite de "Adicionar saldo"). */
export const INITIAL_ACCOUNT_BALANCE = 10_000;

/**
 * Teto do total que uma conta pode adicionar pelo "Adicionar saldo", somando
 * todas as vezes. Depois dele, o saldo só cresce por investimentos.
 */
export const MAX_TOTAL_TOP_UP = 3_000_000;
