import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, RefObject } from "react";
import { ensureRoomBelow } from "@/components/ui/combobox/ensure-room-below";
import {
  filterOptions,
  findTypeaheadIndex,
  type ComboboxOption,
} from "@/components/ui/combobox/combobox-options";

const TYPEAHEAD_RESET_MS = 600;

interface UseComboboxOptions {
  options: ComboboxOption[];
  selectedValue: string;
  // Com `searchable` o gatilho é um campo digitável que filtra a lista;
  // sem ele é um botão de seleção (o que o <select> nativo era).
  searchable: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  onSelect: (value: string) => void;
}

/**
 * Estado e teclado do combobox (padrão ARIA 1.2): o foco fica sempre no
 * gatilho e a opção ativa é apontada por aria-activedescendant.
 */
export function useCombobox({
  options,
  selectedValue,
  searchable,
  anchorRef,
  onSelect,
}: UseComboboxOptions) {
  const listboxId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const typeahead = useRef({ text: "", typedAt: 0 });

  const visibleOptions = searchable ? filterOptions(options, filterText) : options;
  const activeOption = visibleOptions[activeIndex];
  const optionId = (index: number) => `${listboxId}-option-${index}`;
  const activeOptionId = isOpen && activeOption ? optionId(activeIndex) : undefined;

  useEffect(() => {
    if (activeOptionId) {
      document.getElementById(activeOptionId)?.scrollIntoView?.({ block: "nearest" });
    }
  }, [activeOptionId]);

  const show = () => {
    ensureRoomBelow(anchorRef.current);
    setIsOpen(true);
  };

  // Reabrir sempre parte da lista completa, mesmo com um valor já escolhido.
  // Já aberta, não faz nada: o gatilho recebe `focus` de novo quando a janela
  // volta a ficar ativa (trocar de aba/janela) — resetar aí trocava a lista
  // filtrada pela completa bem no meio do clique, e o clique caía na opção que
  // passou a ocupar aquele lugar (ex.: clicar em PETR4 e selecionar BOVA11).
  const open = () => {
    if (isOpen) return;
    setFilterText("");
    setActiveIndex(Math.max(0, options.findIndex((o) => o.value === selectedValue)));
    show();
  };

  const close = () => setIsOpen(false);

  const select = (option: ComboboxOption) => {
    onSelect(option.value);
    close();
  };

  const filterBy = (text: string) => {
    setFilterText(text);
    setActiveIndex(0);
    show();
  };

  const moveActive = (delta: number) =>
    setActiveIndex((current) =>
      Math.min(Math.max(current + delta, 0), visibleOptions.length - 1),
    );

  const jumpByTyping = (key: string) => {
    const now = Date.now();
    const state = typeahead.current;
    state.text = now - state.typedAt > TYPEAHEAD_RESET_MS ? key : state.text + key;
    state.typedAt = now;
    const index = findTypeaheadIndex(visibleOptions, state.text, activeIndex);
    if (index < 0) return;
    if (!isOpen) open();
    setActiveIndex(index);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const isSelectKey = event.key === "Enter" || (event.key === " " && !searchable);

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) open();
      else moveActive(event.key === "ArrowDown" ? 1 : -1);
    } else if (isSelectKey && isOpen && activeOption) {
      event.preventDefault();
      select(activeOption);
    } else if (isSelectKey && !searchable) {
      event.preventDefault();
      open();
    } else if (event.key === "Tab") {
      close();
    } else if (!searchable && isOpen && (event.key === "Home" || event.key === "End")) {
      event.preventDefault();
      setActiveIndex(event.key === "Home" ? 0 : visibleOptions.length - 1);
    } else if (!searchable && event.key.length === 1 && !event.ctrlKey && !event.metaKey && event.key !== " ") {
      jumpByTyping(event.key);
    }
  };

  return {
    isOpen,
    open,
    close,
    toggle: () => (isOpen ? close() : open()),
    select,
    filterBy,
    setActiveIndex,
    visibleOptions,
    activeIndex,
    optionId,
    listboxId,
    triggerAriaProps: {
      role: "combobox" as const,
      "aria-haspopup": "listbox" as const,
      "aria-expanded": isOpen,
      "aria-controls": listboxId,
      "aria-activedescendant": activeOptionId,
      onKeyDown: handleKeyDown,
    },
  };
}
