// @investpro/shared
// Chave PIX: identifica o tipo (CPF, CNPJ, e-mail, celular, aleatória) e
// devolve a forma normalizada do DICT (celular em E.164: +55DDD9XXXXXXXX).
// Fonte única pro domínio de transferências; o web replica a mesma regra em
// src/lib/pix-key.ts.
//
// 11 dígitos podem ser CPF E celular ao mesmo tempo (~8% dos CPFs válidos têm
// "cara" de celular): nesse caso a chave é ambígua e o tipo precisa vir
// explícito (pixKeyType) — nunca adivinhamos pra onde vai o dinheiro.

import { isValidCpf } from '../user/cpf.js';

export const PIX_KEY_TYPES = ['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'EVP'] as const;
export type PixKeyType = (typeof PIX_KEY_TYPES)[number];

export interface PixKey {
  type: PixKeyType;
  value: string;
}

// Limite do DICT (BACEN) para chave e-mail.
const EMAIL_MAX_LENGTH = 77;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EVP_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Só números, com ou sem máscara (CPF, CNPJ, celular).
const NUMERIC_KEY_PATTERN = /^[\d.\-/()\s]+$/;
const E164_BR_MOBILE_PATTERN = /^\+55\d{11}$/;

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

export function isValidCnpj(digits: string): boolean {
  if (!/^\d{14}$/.test(digits) || /^(\d)\1{13}$/.test(digits)) return false;
  const firstDigit = cnpjCheckDigit(digits, CNPJ_FIRST_WEIGHTS);
  const secondDigit = cnpjCheckDigit(digits, CNPJ_SECOND_WEIGHTS);
  return digits.endsWith(`${firstDigit}${secondDigit}`);
}

/** Celular brasileiro sem DDI: DDD em uso + 9 + 8 dígitos. */
export function isMobilePhone(digits: string): boolean {
  return /^\d{11}$/.test(digits) && VALID_DDDS.has(Number(digits.slice(0, 2))) && digits[2] === '9';
}

function numericCandidates(digits: string): PixKey[] {
  const candidates: PixKey[] = [];
  if (isValidCpf(digits)) candidates.push({ type: 'CPF', value: digits });
  if (isMobilePhone(digits)) candidates.push({ type: 'PHONE', value: `+55${digits}` });
  if (isValidCnpj(digits)) candidates.push({ type: 'CNPJ', value: digits });
  return candidates;
}

/** Todas as leituras válidas da chave (mais de uma = ambígua, ex.: CPF e celular). */
export function pixKeyCandidates(raw: string): PixKey[] {
  const key = raw.trim();
  if (!key) return [];

  if (key.includes('@')) {
    const email = key.toLowerCase();
    return email.length <= EMAIL_MAX_LENGTH && EMAIL_PATTERN.test(email)
      ? [{ type: 'EMAIL', value: email }]
      : [];
  }
  if (EVP_PATTERN.test(key)) return [{ type: 'EVP', value: key.toLowerCase() }];
  if (key.startsWith('+')) {
    const phone = key.replace(/[\s()-]/g, '');
    return E164_BR_MOBILE_PATTERN.test(phone) && isMobilePhone(phone.slice(3))
      ? [{ type: 'PHONE', value: phone }]
      : [];
  }
  if (!NUMERIC_KEY_PATTERN.test(key)) return [];
  return numericCandidates(key.replace(/\D/g, ''));
}

/**
 * Chave normalizada, ou null se inválida. Com `type`, só aceita a leitura
 * daquele tipo; sem `type`, recusa chave ambígua.
 */
export function parsePixKey(raw: string, type?: PixKeyType): PixKey | null {
  const candidates = pixKeyCandidates(raw);
  if (type) return candidates.find((candidate) => candidate.type === type) ?? null;
  return candidates.length === 1 ? candidates[0] : null;
}
