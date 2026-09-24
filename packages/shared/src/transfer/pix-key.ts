// @investpro/shared
// Chave PIX: identifica o tipo (CPF, CNPJ, e-mail, telefone, aleatória) e
// devolve a forma normalizada que o DICT usa. Fonte única pro domínio de
// transferências; o web replica a mesma regra em src/lib/pix-key.ts.

import { isValidCpf } from '../user/cpf.js';

export type PixKeyType = 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'EVP';

export interface PixKey {
  type: PixKeyType;
  value: string;
}

// Limite do DICT (BACEN) para chave e-mail.
const EMAIL_MAX_LENGTH = 77;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// +55, DDD (2 dígitos) e número com 8 ou 9 dígitos.
const PHONE_PATTERN = /^\+55\d{10,11}$/;
const EVP_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// CPF/CNPJ podem vir com a máscara usual (pontos, traço, barra).
const DOCUMENT_PATTERN = /^[\d./-]+$/;

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

function classifyDocument(raw: string): PixKey | null {
  const digits = raw.replace(/\D/g, '');
  if (isValidCpf(digits)) return { type: 'CPF', value: digits };
  if (isValidCnpj(digits)) return { type: 'CNPJ', value: digits };
  return null;
}

/** Tipo + valor normalizado da chave PIX, ou null se não for uma chave válida. */
export function parsePixKey(raw: string): PixKey | null {
  const key = raw.trim();
  if (!key) return null;

  if (key.includes('@')) {
    const email = key.toLowerCase();
    return email.length <= EMAIL_MAX_LENGTH && EMAIL_PATTERN.test(email)
      ? { type: 'EMAIL', value: email }
      : null;
  }
  if (EVP_PATTERN.test(key)) return { type: 'EVP', value: key.toLowerCase() };
  if (key.startsWith('+')) {
    const phone = key.replace(/[\s()-]/g, '');
    return PHONE_PATTERN.test(phone) ? { type: 'PHONE', value: phone } : null;
  }
  if (DOCUMENT_PATTERN.test(key)) return classifyDocument(key);
  return null;
}
