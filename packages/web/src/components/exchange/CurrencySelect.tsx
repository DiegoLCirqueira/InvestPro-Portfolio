import { FormField } from "@/components/FormField";
import { Combobox } from "@/components/ui/combobox";
import { currencyName } from "@/lib/currency";

interface CurrencySelectProps {
  id: string;
  label: string;
  value: string;
  currencies: string[];
  onChange: (currency: string) => void;
}

export function CurrencySelect({
  id,
  label,
  value,
  currencies,
  onChange,
}: CurrencySelectProps) {
  const options = currencies.map((code) => ({
    value: code,
    label: `${code} — ${currencyName(code)}`,
  }));

  return (
    <FormField label={label} htmlFor={id}>
      <Combobox
        id={id}
        options={options}
        value={value}
        onValueChange={onChange}
        className="font-mono"
        optionClassName="font-mono"
      />
    </FormField>
  );
}
