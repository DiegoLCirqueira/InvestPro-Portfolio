import { fieldInputClassName } from "@/components/FormField";
import type { CurrencyDigitsInput } from "@/hooks/use-currency-digits-input";

interface CurrencyDigitsFieldProps {
  input: CurrencyDigitsInput;
  ariaLabel: string;
  id?: string;
  /** Marca o campo como inválido (aria-invalid) quando há erro de validação ligado a ele. */
  invalid?: boolean;
  /** Id do texto que explica o campo (ex.: o aviso de valor acima do saldo). */
  describedBy?: string;
  autoFocus?: boolean;
}

export function CurrencyDigitsField({
  input,
  ariaLabel,
  id,
  invalid = false,
  describedBy,
  autoFocus,
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
      aria-describedby={describedBy}
      autoFocus={autoFocus}
      className={`${fieldInputClassName} tabular-nums`}
    />
  );
}
