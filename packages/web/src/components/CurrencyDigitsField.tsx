import { fieldInputClassName } from "@/components/FormField";
import type { CurrencyDigitsInput } from "@/hooks/use-currency-digits-input";

interface CurrencyDigitsFieldProps {
  input: CurrencyDigitsInput;
  ariaLabel: string;
  id?: string;
  /** Marca o campo como inválido (aria-invalid) quando há erro de validação ligado a ele. */
  invalid?: boolean;
}

export function CurrencyDigitsField({
  input,
  ariaLabel,
  id,
  invalid = false,
}: CurrencyDigitsFieldProps) {
  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      value={input.displayValue}
      onChange={input.onChange}
      onPaste={input.onPaste}
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      className={`${fieldInputClassName} tabular-nums`}
    />
  );
}
