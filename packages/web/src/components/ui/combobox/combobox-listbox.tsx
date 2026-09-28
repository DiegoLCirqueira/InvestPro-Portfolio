import { Check } from "lucide-react";
import type { ComboboxOption } from "@/components/ui/combobox/combobox-options";
import { cn } from "@/lib/utils";

interface ComboboxOptionRowProps {
  option: ComboboxOption;
  id: string;
  isActive: boolean;
  isSelected: boolean;
  className?: string;
  onHover: () => void;
  onSelect: () => void;
}

function ComboboxOptionRow({
  option,
  id,
  isActive,
  isSelected,
  className,
  onHover,
  onSelect,
}: ComboboxOptionRowProps) {
  return (
    <div
      id={id}
      role="option"
      aria-selected={isSelected}
      data-active={isActive}
      // Impede que o clique tire o foco do gatilho (o foco nunca sai dele).
      onMouseDown={(event) => event.preventDefault()}
      onMouseMove={onHover}
      onClick={onSelect}
      className={cn(
        "flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground data-[active=true]:bg-secondary",
        className,
      )}
    >
      <span className="flex items-center gap-2 min-w-0">
        <Check
          size={14}
          aria-hidden="true"
          className={cn("shrink-0", isSelected ? "opacity-100" : "opacity-0")}
        />
        <span className="truncate">{option.label}</span>
      </span>
      {option.description && (
        <span className="text-xs text-muted-foreground truncate">
          {option.description}
        </span>
      )}
    </div>
  );
}

interface ComboboxListboxProps {
  options: ComboboxOption[];
  selectedValue: string;
  activeIndex: number;
  optionId: (index: number) => string;
  optionClassName?: string;
  onHover: (index: number) => void;
  onSelect: (option: ComboboxOption) => void;
}

export function ComboboxListbox({
  options,
  selectedValue,
  activeIndex,
  optionId,
  optionClassName,
  onHover,
  onSelect,
}: ComboboxListboxProps) {
  return options.map((option, index) => (
    <ComboboxOptionRow
      key={option.value}
      option={option}
      id={optionId(index)}
      isActive={index === activeIndex}
      isSelected={option.value === selectedValue}
      className={optionClassName}
      onHover={() => onHover(index)}
      onSelect={() => onSelect(option)}
    />
  ));
}

export function ComboboxMessage({ children }: { children: string }) {
  return <p className="px-3 py-2.5 text-sm text-muted-foreground">{children}</p>;
}
