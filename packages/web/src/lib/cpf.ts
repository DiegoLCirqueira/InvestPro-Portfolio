// Mesma regra do @investpro/shared (o web não importa o shared): 11 dígitos, dígitos verificadores
// corretos e não é uma sequência repetida.
export const CPF_LENGTH = 11;

export function normalizeCpf(value: string): string {
  return value.replace(/\D/g, "").slice(0, CPF_LENGTH);
}

// Máscara progressiva 000.000.000-00: mostra só o que já foi digitado.
export function formatCpf(value: string): string {
  const digits = normalizeCpf(value);
  const [a, b, c, d] = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 9), digits.slice(9)];
  return [a, b && `.${b}`, c && `.${c}`, d && `-${d}`].filter(Boolean).join("");
}

// Soma ponderada (pesos decrescentes a partir de digits.length + 1) módulo 11; resto < 2 vira 0.
function checkDigitOf(digits: string): number {
  const weightStart = digits.length + 1;
  const sum = [...digits].reduce((total, digit, index) => total + Number(digit) * (weightStart - index), 0);
  const remainder = (sum * 10) % 11;
  return remainder === 10 ? 0 : remainder;
}

export function isValidCpf(value: string): boolean {
  const digits = normalizeCpf(value);
  if (digits.length !== CPF_LENGTH || /^(\d)\1{10}$/.test(digits)) return false;
  const withFirstDigit = digits.slice(0, 9) + checkDigitOf(digits.slice(0, 9));
  return withFirstDigit + checkDigitOf(withFirstDigit) === digits;
}
