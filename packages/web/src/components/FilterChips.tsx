interface FilterOption<T extends string> {
  value: T;
  label: string;
}

interface FilterChipsProps<T extends string> {
  options: ReadonlyArray<FilterOption<T>>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}

// Filtros de categoria (Mercado e Notícias) com o mesmo comportamento: no celular um trilho que
// rola na horizontal, com a borda direita esmaecida para indicar que há mais; no desktop, em
// linha. Antes as Notícias quebravam em 2 linhas e o Mercado rolava.
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: FilterChipsProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex gap-2 overflow-x-auto scrollbar-none pr-6 [mask-image:linear-gradient(to_right,black_85%,transparent)] nav:flex-wrap nav:overflow-visible nav:pr-0 nav:[mask-image:none]"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`shrink-0 whitespace-nowrap min-h-11 text-2xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
            value === option.value
              ? "bg-primary-solid text-primary-foreground border-brand-primary"
              : "bg-secondary/60 text-muted-foreground border-border hover:border-brand-primary/40"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
