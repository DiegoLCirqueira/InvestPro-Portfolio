import { useState } from "react";
import type { ChangeEvent } from "react";
import { formatCurrency } from "@/lib/format";

/**
 * Input de moeda "dígitos primeiro" (padrão de apps bancários BR): o usuário
 * só digita números, sem ponto/vírgula, e o valor é montado a partir dos
 * centavos (ex.: "500" = R$ 5,00). Backspace remove o último dígito porque a
 * extração roda sobre o valor formatado já editado pelo navegador, não sobre
 * um índice de cursor.
 */
export function useCurrencyDigitsInput(initialDigits = "") {
  const [digits, setDigits] = useState(initialDigits);
  const amount = Number(digits || "0") / 100;

  return {
    amount,
    displayValue: formatCurrency(amount),
    onChange: (e: ChangeEvent<HTMLInputElement>) =>
      setDigits(e.target.value.replace(/\D/g, "")),
    reset: () => setDigits(""),
  };
}

export type CurrencyDigitsInput = ReturnType<typeof useCurrencyDigitsInput>;
