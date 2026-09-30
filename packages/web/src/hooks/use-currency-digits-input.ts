import { useState } from "react";
import type { ChangeEvent, ClipboardEvent } from "react";
import { formatCurrency } from "@/lib/format";

// Valor colado no formato pt-BR: "50", "1.234,56", "10,5". Até 2 casas decimais.
const PASTED_AMOUNT = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/;

/**
 * Converte um valor colado (formato pt-BR, com ou sem símbolo "R$"/"US$") para os
 * dígitos em centavos do input. Retorna null quando o texto não é um valor válido
 * (negativo, mais de 2 casas, letras): a colagem é ignorada em vez de virar um
 * número diferente do pretendido.
 */
export function parsePastedAmountToDigits(text: string): string | null {
  const normalized = text
    .trim()
    .replace(/^[A-Za-z]*\$/, "")
    .replace(/\s/g, "");
  const match = PASTED_AMOUNT.exec(normalized);
  if (!match) return null;
  const units = match[1].replace(/\./g, "");
  const cents = (match[2] ?? "").padEnd(2, "0");
  return String(Number(`${units}${cents}`));
}

/**
 * Input de moeda "dígitos primeiro" (padrão de apps bancários BR): o usuário
 * só digita números, sem ponto/vírgula, e o valor é montado a partir dos
 * centavos (ex.: "500" = R$ 5,00). Backspace remove o último dígito porque a
 * extração roda sobre o valor formatado já editado pelo navegador, não sobre
 * um índice de cursor. Colar é diferente: o texto colado é lido como o valor
 * por extenso ("10,50" = R$ 10,50).
 */
// Valor em reais → dígitos em centavos inteiros do input (0 ou negativo = campo vazio).
const toDigits = (value: number) => (value > 0 ? String(Math.round(value * 100)) : "");

export function useCurrencyDigitsInput({
  currency = "BRL",
  initialAmount = 0,
}: { currency?: string; initialAmount?: number } = {}) {
  const [digits, setDigits] = useState(() => toDigits(initialAmount));
  const amount = Number(digits || "0") / 100;

  return {
    amount,
    // Símbolo da moeda em que o valor é digitado (no câmbio, a de origem).
    displayValue: formatCurrency(amount, currency),
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      // Não existe valor negativo aqui: o "-" é recusado em vez de descartado
      // em silêncio (o que transformava "-50" em R$ 0,50).
      if (e.target.value.includes("-")) return;
      setDigits(e.target.value.replace(/\D/g, ""));
    },
    onPaste: (e: ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = parsePastedAmountToDigits(e.clipboardData.getData("text"));
      if (pasted !== null) setDigits(pasted);
    },
    /** Preenche com um valor (atalhos de valor, pré-preenchimento): sempre em centavos inteiros. */
    setAmount: (value: number) => setDigits(toDigits(value)),
    reset: () => setDigits(""),
  };
}

export type CurrencyDigitsInput = ReturnType<typeof useCurrencyDigitsInput>;
