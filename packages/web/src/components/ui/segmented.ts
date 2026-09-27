import { cn } from "@/lib/utils";

type SegmentTone = "primary" | "destructive";

const SEGMENT_BASE =
  "min-h-11 py-2.5 rounded-xl border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

// A opção escolhida NÃO usa o preenchimento cheio do botão que executa a ação (senão a Caixinha
// mostrava dois "Depositar" verdes iguais): borda e texto no tom, sobre um fundo leve (8%, texto >= 4,5:1) do mesmo
// tom, que continua visível no tema escuro.
const SELECTED: Record<SegmentTone, string> = {
  primary: "border-primary bg-primary/8 text-primary",
  destructive: "border-destructive bg-destructive/8 text-destructive",
};

const UNSELECTED =
  "border-input bg-surface-2 text-muted-foreground hover:border-border-strong hover:text-foreground";

/** Classes de uma opção de seletor (Compra/Venda, PIX/TED/DOC, Depositar/Resgatar). */
export function segmentClassName(
  selected: boolean,
  tone: SegmentTone = "primary",
  className?: string,
): string {
  return cn(SEGMENT_BASE, selected ? SELECTED[tone] : UNSELECTED, className);
}
