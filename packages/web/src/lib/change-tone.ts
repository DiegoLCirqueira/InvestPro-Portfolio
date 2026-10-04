/**
 * Cor de uma variação em %: alta em verde, queda em vermelho e zero neutro (nem verde de alta
 * nem vermelho de queda). Um só lugar para o Mercado e o Painel não divergirem.
 */
export function changeToneClass(value: number): string {
  if (value > 0) return "text-brand-primary";
  if (value < 0) return "text-destructive";
  return "text-muted-foreground";
}
