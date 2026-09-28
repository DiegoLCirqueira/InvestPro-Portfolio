import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Padrão único de card: cantos de contêiner, borda, fundo de superfície e padding 16/24px.
 * Sem sombra: sombra só nas camadas flutuantes (menu, diálogo, toast). Exportado também como
 * classe para elementos que não são <div> (form, section, article, link).
 */
export const cardClassName = "rounded-2xl border border-border bg-surface-1 p-4 sm:p-6";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn(cardClassName, className)} {...props} />
  ),
);
Card.displayName = "Card";

export { Card };
