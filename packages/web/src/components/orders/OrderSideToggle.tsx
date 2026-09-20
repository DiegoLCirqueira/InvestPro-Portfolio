import type { OrderSide } from "@/types/order";

const SIDE_OPTIONS: { value: OrderSide; label: string }[] = [
  { value: "BUY", label: "Compra" },
  { value: "SELL", label: "Venda" },
];

const SELECTED_CLASS: Record<OrderSide, string> = {
  BUY: "bg-primary-solid text-primary-foreground border-brand-primary",
  SELL: "bg-destructive-solid text-destructive-foreground border-destructive",
};

const UNSELECTED_CLASS =
  "bg-surface-2 text-muted-foreground border-input hover:border-border-strong";

interface OrderSideToggleProps {
  value: OrderSide;
  onChange: (side: OrderSide) => void;
}

export function OrderSideToggle({ value, onChange }: OrderSideToggleProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {SIDE_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`min-h-11 py-2.5 rounded-xl border text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
            value === option.value ? SELECTED_CLASS[option.value] : UNSELECTED_CLASS
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
