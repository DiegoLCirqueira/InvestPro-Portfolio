import { fieldInputClassName } from "@/components/FormField";
import type { CurrencyDigitsInput } from "@/hooks/use-currency-digits-input";

interface CurrencyDigitsFieldProps {
  input: CurrencyDigitsInput;
  ariaLabel: string;
  id?: string;
}

export function CurrencyDigitsField({
  input,
  ariaLabel,
  id,
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
      className={`${fieldInputClassName} tabular-nums`}
    />
  );
}
