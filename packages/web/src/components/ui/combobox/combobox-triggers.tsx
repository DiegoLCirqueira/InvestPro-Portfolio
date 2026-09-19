import { ChevronDown } from "lucide-react";
import type { ComponentProps, KeyboardEvent, Ref } from "react";
import { PopoverAnchor } from "@/components/ui/popover";
import { fieldButtonClassName, fieldInputClassName } from "@/components/FormField";
import { cn } from "@/lib/utils";

export interface ComboboxAriaProps {
  role: "combobox";
  "aria-haspopup": "listbox";
  "aria-expanded": boolean;
  "aria-controls": string;
  "aria-activedescendant": string | undefined;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}

interface SearchInputProps extends ComponentProps<"input"> {
  ariaProps: ComboboxAriaProps;
  anchorRef: Ref<HTMLInputElement>;
}

/** Gatilho digitável: o texto filtra a lista e vira o valor. */
export function ComboboxSearchInput({
  ariaProps,
  anchorRef,
  className,
  ...inputProps
}: SearchInputProps) {
  return (
    <PopoverAnchor asChild>
      <input
        ref={anchorRef}
        type="text"
        autoComplete="off"
        aria-autocomplete="list"
        className={cn(fieldInputClassName, className)}
        {...ariaProps}
        {...inputProps}
      />
    </PopoverAnchor>
  );
}

interface SelectButtonProps extends ComponentProps<"button"> {
  ariaProps: ComboboxAriaProps;
  anchorRef: Ref<HTMLButtonElement>;
  label: string | undefined;
  placeholder?: string;
}

/** Gatilho de seleção: mostra a opção escolhida, como um <select>. */
export function ComboboxSelectButton({
  ariaProps,
  anchorRef,
  label,
  placeholder,
  className,
  ...buttonProps
}: SelectButtonProps) {
  return (
    <PopoverAnchor asChild>
      <button
        ref={anchorRef}
        type="button"
        // Enter/Espaço são tratados no keydown; sem isto o Espaço ainda
        // dispararia um clique nativo no keyup e reabriria o menu recém-fechado.
        onKeyUp={(event) => event.key === " " && event.preventDefault()}
        className={cn(fieldButtonClassName, className)}
        {...ariaProps}
        {...buttonProps}
      >
        <span className={cn("truncate", !label && "text-muted-foreground")}>
          {label ?? placeholder}
        </span>
        <ChevronDown size={16} aria-hidden="true" className="shrink-0 opacity-50" />
      </button>
    </PopoverAnchor>
  );
}
