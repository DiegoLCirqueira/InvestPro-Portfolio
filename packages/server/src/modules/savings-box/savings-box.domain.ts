// @investpro/server
// Lógica pura da caixinha. Sem dependência de I/O/DB.

// Rendimento fixo simulado (demo): taxa anual informativa, juros SIMPLES —
// sem compostos reais e sem job de accrual. Serve só pra exibir uma projeção
// (balance * rate * tempo decorrido / 365) a partir do depósito; o balance em
// si só muda por depósito/resgate, nunca pelo "rendimento" em si.
export const SAVINGS_BOX_ANNUAL_RATE = 0.06;

export function estimateSimpleYield(
  balance: number,
  daysElapsed: number,
  annualRate: number = SAVINGS_BOX_ANNUAL_RATE
): number {
  if (balance <= 0 || daysElapsed <= 0) return 0;
  return balance * annualRate * (daysElapsed / 365);
}
