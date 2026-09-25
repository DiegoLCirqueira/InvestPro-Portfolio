// Mesma regra do @investpro/shared (transfer/pix-key.ts; o web não importa o shared):
// CPF, CNPJ, e-mail (até 77 caracteres), celular (DDD em uso + 9) ou chave aleatória
// (UUID). 11 dígitos podem ser CPF e celular ao mesmo tempo: aí a chave é ambígua e
// a tela pergunta o tipo. Aqui também mora a máscara de exibição de cada tipo.
import { isValidCpf } from "@/lib/cpf";

export type PixKeyType = "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "EVP";

export interface PixKey {
  type: PixKeyType;
  /** Forma normalizada enviada à API (celular em E.164: +55DDD9XXXXXXXX). */
  value: string;
}

export const PIX_KEY_TYPE_LABELS: Record<PixKeyType, string> = {
  CPF: "CPF",
  CNPJ: "CNPJ",
  EMAIL: "E-mail",
  PHONE: "Celular",
  EVP: "Chave aleatória",
};

const EMAIL_MAX_LENGTH = 77;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EVP_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NUMERIC_KEY_PATTERN = /^[\d.\-/()\s]+$/;
const E164_BR_MOBILE_PATTERN = /^\+55\d{11}$/;
const CNPJ_LENGTH = 14;

// DDDs em uso no Brasil (Anatel).
const VALID_DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68,
  69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95,
  96, 97, 98, 99,
]);

const CNPJ_FIRST_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_SECOND_WEIGHTS = [6, ...CNPJ_FIRST_WEIGHTS];

function cnpjCheckDigit(digits: string, weights: number[]): number {
  const sum = weights.reduce((acc, weight, index) => acc + Number(digits[index]) * weight, 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

function isValidCnpj(digits: string): boolean {
  if (!/^\d{14}$/.test(digits) || /^(\d)\1{13}$/.test(digits)) return false;
  const firstDigit = cnpjCheckDigit(digits, CNPJ_FIRST_WEIGHTS);
  const secondDigit = cnpjCheckDigit(digits, CNPJ_SECOND_WEIGHTS);
  return digits.endsWith(`${firstDigit}${secondDigit}`);
}

function isMobilePhone(digits: string): boolean {
  return /^\d{11}$/.test(digits) && VALID_DDDS.has(Number(digits.slice(0, 2))) && digits[2] === "9";
}

export function isNumericPixKey(raw: string): boolean {
  return NUMERIC_KEY_PATTERN.test(raw);
}

/** Todas as leituras válidas da chave (mais de uma = ambígua: CPF e celular). */
export function pixKeyCandidates(raw: string): PixKey[] {
  const key = raw.trim();
  if (!key) return [];

  if (key.includes("@")) {
    const email = key.toLowerCase();
    return email.length <= EMAIL_MAX_LENGTH && EMAIL_PATTERN.test(email)
      ? [{ type: "EMAIL", value: email }]
      : [];
  }
  if (EVP_PATTERN.test(key)) return [{ type: "EVP", value: key.toLowerCase() }];
  if (key.startsWith("+")) {
    const phone = key.replace(/[\s()-]/g, "");
    return E164_BR_MOBILE_PATTERN.test(phone) && isMobilePhone(phone.slice(3))
      ? [{ type: "PHONE", value: phone }]
      : [];
  }
  if (!isNumericPixKey(key)) return [];

  const digits = key.replace(/\D/g, "");
  const candidates: PixKey[] = [];
  if (isValidCpf(digits)) candidates.push({ type: "CPF", value: digits });
  if (isMobilePhone(digits)) candidates.push({ type: "PHONE", value: `+55${digits}` });
  if (isValidCnpj(digits)) candidates.push({ type: "CNPJ", value: digits });
  return candidates;
}

function formatDigits(digits: string, type: PixKeyType): string {
  switch (type) {
    case "CPF":
      return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
    case "CNPJ":
      return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
    case "PHONE":
      return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, "$1 $2-$3");
    default:
      return digits;
  }
}

/** Chave como o usuário lê: 529.982.247-25, 82 99123-4567, 11.222.333/0001-81. */
export function formatPixKey({ type, value }: PixKey): string {
  const digits = type === "PHONE" ? value.replace(/^\+55/, "") : value;
  return formatDigits(digits, type);
}

/** Máscara pro valor digitado: só números, até o tamanho do CNPJ; formata quando há leitura única. */
export function maskNumericPixKey(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, CNPJ_LENGTH);
  const candidates = pixKeyCandidates(digits);
  return candidates.length === 1 ? formatPixKey(candidates[0]) : digits;
}

/**
 * Chave gravada pela API (já normalizada) formatada pro histórico. Celular é
 * sempre gravado com +55, então 11 dígitos puros são CPF, sem ambiguidade.
 */
export function formatStoredPixKey(value: string): string {
  if (/^\+55\d{11}$/.test(value)) return formatPixKey({ type: "PHONE", value });
  if (/^\d{11}$/.test(value)) return formatDigits(value, "CPF");
  if (/^\d{14}$/.test(value)) return formatDigits(value, "CNPJ");
  return value;
}
