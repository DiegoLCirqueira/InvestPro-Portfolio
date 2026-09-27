import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { ChangeEvent, ClipboardEvent } from "react";
import {
  parsePastedAmountToDigits,
  useCurrencyDigitsInput,
} from "@/hooks/use-currency-digits-input";

function change(value: string) {
  return { target: { value } } as ChangeEvent<HTMLInputElement>;
}

function paste(text: string) {
  return {
    preventDefault: () => {},
    clipboardData: { getData: () => text },
  } as unknown as ClipboardEvent<HTMLInputElement>;
}

describe("parsePastedAmountToDigits", () => {
  it.each([
    ["50", "5000"],
    ["10,5", "1050"],
    ["10,50", "1050"],
    ["1.234,56", "123456"],
    ["R$ 1.234,56", "123456"],
    ["US$ 10", "1000"],
  ])("'%s' vira os centavos %s", (text, digits) => {
    expect(parsePastedAmountToDigits(text)).toBe(digits);
  });

  it.each(["-50", "10,005", "abc", "1.23", "", "10,"])(
    "'%s' não é um valor válido",
    (text) => {
      expect(parsePastedAmountToDigits(text)).toBeNull();
    },
  );
});

describe("useCurrencyDigitsInput", () => {
  it("digitar monta o valor a partir dos centavos", () => {
    const { result } = renderHook(() => useCurrencyDigitsInput());

    act(() => result.current.onChange(change("R$ 0,005")));

    expect(result.current.amount).toBe(0.05);
  });

  it("digitar '-' é recusado e mantém o valor atual", () => {
    const { result } = renderHook(() => useCurrencyDigitsInput());
    act(() => result.current.onChange(change("R$ 0,05")));

    act(() => result.current.onChange(change("-R$ 0,05")));

    expect(result.current.amount).toBe(0.05);
  });

  it("colar um valor em reais usa o valor por extenso", () => {
    const { result } = renderHook(() => useCurrencyDigitsInput());

    act(() => result.current.onPaste(paste("1.234,56")));

    expect(result.current.amount).toBe(1234.56);
  });

  it("colar um valor inválido não muda o campo", () => {
    const { result } = renderHook(() => useCurrencyDigitsInput());
    act(() => result.current.onPaste(paste("10")));

    act(() => result.current.onPaste(paste("10,005")));

    expect(result.current.amount).toBe(10);
  });
});
