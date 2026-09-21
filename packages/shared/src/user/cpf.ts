// @investpro/shared
// CPF: normalização e validação pelos dígitos verificadores. Fonte única pro
// perfil (definir CPF) e pros testes que precisam gerar CPFs válidos.

const BASE_LENGTH = 9;

export function normalizeCpf(value: string): string {
  return value.replace(/\D/g, '');
}

// Dígito verificador do CPF: soma ponderada (pesos decrescentes a partir de
// digits.length + 1) módulo 11; resto < 2 vira 0, senão 11 - resto.
function checkDigitOf(digits: string): number {
  const weightStart = digits.length + 1;
  const sum = [...digits].reduce((acc, digit, index) => acc + Number(digit) * (weightStart - index), 0);
  const remainder = (sum * 10) % 11;
  return remainder === 10 ? 0 : remainder;
}

/** Monta um CPF válido (11 dígitos) a partir dos 9 dígitos base. */
export function buildCpfFromBase(base: string): string {
  if (!/^\d{9}$/.test(base)) throw new Error(`CPF base deve ter ${BASE_LENGTH} dígitos`);
  const withFirstDigit = base + checkDigitOf(base);
  return withFirstDigit + checkDigitOf(withFirstDigit);
}

/** true se `digits` (só números, 11) tem dígitos verificadores corretos e não é sequência repetida. */
export function isValidCpf(digits: string): boolean {
  if (!/^\d{11}$/.test(digits) || /^(\d)\1{10}$/.test(digits)) return false;
  return buildCpfFromBase(digits.slice(0, BASE_LENGTH)) === digits;
}

