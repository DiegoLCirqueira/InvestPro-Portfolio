import { useRef } from "react";
import type { ChangeEvent } from "react";
import {
  ComboboxListbox,
  ComboboxMessage,
} from "@/components/ui/combobox/combobox-listbox";
import type { ComboboxOption } from "@/components/ui/combobox/combobox-options";
import {
  ComboboxSearchInput,
  ComboboxSelectButton,
} from "@/components/ui/combobox/combobox-triggers";
import { useCombobox } from "@/components/ui/combobox/use-combobox";
import { Popover, PopoverContent } from "@/components/ui/popover";

interface ComboboxProps {
  id?: string;
  options: ComboboxOption[];
  value: string;
  onValueChange: (value: string) => void;
  // true: campo digitável (o texto é o valor); false: botão de seleção.
  searchable?: boolean;
  placeholder?: string;
  isLoading?: boolean;
  loadingMessage?: string;
  emptyMessage?: string;
  className?: string;
  optionClassName?: string;
}

/**
 * Seleção/combobox único do app: um menu com o mesmo posicionamento
 * (PopoverContent) e o mesmo teclado/ARIA, seja o gatilho um botão de
 * seleção (Tipo, De/Para) ou um campo digitável (Ativo).
 */
export function Combobox({
  id,
  options,
  value,
  onValueChange,
  searchable = false,
  placeholder,
  isLoading = false,
  loadingMessage = "Carregando...",
  emptyMessage = "Nenhuma opção encontrada.",
  className,
  optionClassName,
}: ComboboxProps) {
  const anchorRef = useRef<HTMLInputElement & HTMLButtonElement>(null);
  const combobox = useCombobox({
    options,
    selectedValue: value,
    searchable,
    anchorRef,
    onSelect: onValueChange,
  });

  const selectedLabel = options.find((option) => option.value === value)?.label;
  const hasOptions = combobox.visibleOptions.length > 0 && !isLoading;

  const handleTyping = (event: ChangeEvent<HTMLInputElement>) => {
    onValueChange(event.target.value);
    combobox.filterBy(event.target.value);
  };

  return (
    <Popover
      open={combobox.isOpen}
      onOpenChange={(next) => (next ? combobox.open() : combobox.close())}
    >
      {searchable ? (
        <ComboboxSearchInput
          id={id}
          anchorRef={anchorRef}
          ariaProps={combobox.triggerAriaProps}
          value={value}
          placeholder={placeholder}
          className={className}
          onChange={handleTyping}
          onFocus={combobox.open}
          onClick={() => !combobox.isOpen && combobox.open()}
        />
      ) : (
        <ComboboxSelectButton
          id={id}
          anchorRef={anchorRef}
          ariaProps={combobox.triggerAriaProps}
          label={selectedLabel}
          placeholder={placeholder}
          className={className}
          onClick={combobox.toggle}
        />
      )}

      <PopoverContent
        id={combobox.listboxId}
        role={hasOptions ? "listbox" : "status"}
        // O foco fica no gatilho: o menu nunca o rouba ao abrir nem ao fechar.
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        // Clicar no próprio gatilho não conta como "clicar fora" (senão fecharia e reabriria).
        onInteractOutside={(event) => {
          if (anchorRef.current?.contains(event.target as Node)) event.preventDefault();
        }}
      >
        {isLoading && <ComboboxMessage>{loadingMessage}</ComboboxMessage>}
        {!isLoading && !hasOptions && <ComboboxMessage>{emptyMessage}</ComboboxMessage>}
        {hasOptions && (
          <ComboboxListbox
            options={combobox.visibleOptions}
            selectedValue={value}
            activeIndex={combobox.activeIndex}
            optionId={combobox.optionId}
            optionClassName={optionClassName}
            onHover={combobox.setActiveIndex}
            onSelect={combobox.select}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
