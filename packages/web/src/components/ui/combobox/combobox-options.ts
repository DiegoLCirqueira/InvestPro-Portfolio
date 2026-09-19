export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
}

export function filterOptions(
  options: ComboboxOption[],
  query: string,
): ComboboxOption[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return options;
  return options.filter((option) =>
    [option.value, option.label, option.description].some((text) =>
      text?.toLowerCase().includes(normalizedQuery),
    ),
  );
}

// Próxima opção cujo rótulo começa com o texto digitado. Uma letra só avança
// a partir da ativa (letras repetidas percorrem as opções); mais letras
// refinam a partir dela. -1 se nenhuma.
export function findTypeaheadIndex(
  options: ComboboxOption[],
  typed: string,
  activeIndex: number,
): number {
  const prefix = typed.toLowerCase();
  const firstCandidate = typed.length === 1 ? activeIndex + 1 : activeIndex;

  for (let step = 0; step < options.length; step++) {
    const index = (firstCandidate + step) % options.length;
    if (options[index].label.toLowerCase().startsWith(prefix)) return index;
  }
  return -1;
}
