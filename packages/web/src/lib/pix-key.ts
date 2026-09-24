// Mesma regra do @investpro/shared (transfer/pix-key.ts; o web não importa o shared):
// CPF, CNPJ, e-mail (até 77 caracteres), telefone com +55 ou chave aleatória (UUID).
import { isValidCpf } from "@/lib/cpf";

const EMAIL_MAX_LENGTH = 77;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+55\d{10,11}$/;
const EVP_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DOCUMENT_PATTERN = /^[\d./-]+$/;

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

export function isValidPixKey(raw: string): boolean {
  const key = raw.trim();
  if (!key) return false;
  if (key.includes("@")) return key.length <= EMAIL_MAX_LENGTH && EMAIL_PATTERN.test(key);
  if (EVP_PATTERN.test(key)) return true;
  if (key.startsWith("+")) return PHONE_PATTERN.test(key.replace(/[\s()-]/g, ""));
  if (!DOCUMENT_PATTERN.test(key)) return false;
  const digits = key.replace(/\D/g, "");
  return (digits.length === 11 && isValidCpf(digits)) || isValidCnpj(digits);
}
