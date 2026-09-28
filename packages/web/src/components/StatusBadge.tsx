export type StatusTone =
  "success" | "warning" | "danger" | "info" | "neutral" | "purple";

const TONE_CLASSES: Record<StatusTone, string> = {
  success: "bg-brand-primary/15 text-brand-primary",
  warning: "bg-warning/15 text-warning",
  danger: "bg-destructive/15 text-destructive",
  info: "bg-info/15 text-info",
  neutral: "bg-secondary text-muted-foreground",
  purple: "bg-highlight/15 text-highlight",
};

// A decoração é medida em em: padding e largura acompanham a fonte, então o
// texto sempre cabe dentro dela, em qualquer viewport.
const BASE_CLASSES =
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-[0.7em] py-[0.4em] text-2xs font-semibold uppercase tracking-wide";

// "Oportunidade" (o rótulo mais longo) ocupa ~7,5em + 1,4em de padding.
const UNIFORM_WIDTH_CLASS = "min-w-[9em]";

interface StatusBadgeProps {
  label: string;
  tone: StatusTone;
  /** Largura mínima uniforme entre badges vizinhos (ex.: colunas de tabela); nunca corta o texto. */
  uniformWidth?: boolean;
  title?: string;
}

export function StatusBadge({
  label,
  tone,
  uniformWidth = false,
  title,
}: StatusBadgeProps) {
  return (
    <span
      title={title}
      className={`${BASE_CLASSES} ${TONE_CLASSES[tone]} ${uniformWidth ? UNIFORM_WIDTH_CLASS : ""}`}
    >
      {label}
    </span>
  );
}
