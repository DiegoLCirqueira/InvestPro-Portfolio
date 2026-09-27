import { segmentClassName } from "@/components/ui/segmented";
import type { OrderSide } from "@/types/order";

const SIDE_OPTIONS: { value: OrderSide; label: string }[] = [
  { value: "BUY", label: "Compra" },
  { value: "SELL", label: "Venda" },
];

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
          className={segmentClassName(
            value === option.value,
            option.value === "SELL" ? "destructive" : "primary",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
