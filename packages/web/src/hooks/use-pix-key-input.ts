import { useState } from "react";
import type { ChangeEvent } from "react";
import {
  formatPixKey,
  isNumericPixKey,
  maskNumericPixKey,
  pixKeyCandidates,
  type PixKey,
  type PixKeyType,
} from "@/lib/pix-key";

// Campo único de chave PIX, como nos apps de banco: o usuário digita só os
// números e a tela reconhece CPF/CNPJ/celular e aplica a máscara quando a
// chave fica completa. Se os dígitos servem pra CPF e celular, pede o tipo.
export function usePixKeyInput() {
  const [displayValue, setDisplayValue] = useState("");
  const [chosenType, setChosenType] = useState<PixKeyType | null>(null);

  const candidates = pixKeyCandidates(displayValue);
  const chosenKey = chosenType ? candidates.find((candidate) => candidate.type === chosenType) : undefined;
  const pixKey: PixKey | null = chosenKey ?? (candidates.length === 1 ? candidates[0] : null);
  const ambiguousTypes = pixKey ? [] : candidates.map((candidate) => candidate.type);

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setChosenType(null);
    setDisplayValue(value && isNumericPixKey(value) ? maskNumericPixKey(value) : value);
  };

  const chooseType = (type: PixKeyType) => {
    const candidate = candidates.find((item) => item.type === type);
    if (!candidate) return;
    setChosenType(type);
    setDisplayValue(formatPixKey(candidate));
  };

  const reset = () => {
    setDisplayValue("");
    setChosenType(null);
  };

  return {
    displayValue,
    onChange,
    pixKey,
    /** Tipos possíveis quando a chave é ambígua (ex.: ["CPF", "PHONE"]); vazio caso contrário. */
    ambiguousTypes,
    isEmpty: !displayValue.trim(),
    chooseType,
    reset,
  };
}
