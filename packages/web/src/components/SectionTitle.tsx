import type { ReactNode, Ref } from "react";
import { cn } from "@/lib/utils";

interface SectionTitleProps {
  id?: string;
  className?: string;
  /** Para receber foco por código (ex.: resultado do Câmbio no celular). */
  ref?: Ref<HTMLHeadingElement>;
  tabIndex?: number;
  children: ReactNode;
}

// Título de seção (h2, logo abaixo do h1 do PageHeader): um estilo só no lugar das variações
// de tamanho e peso que cada card usava.
export function SectionTitle({ id, className, ref, tabIndex, children }: SectionTitleProps) {
  return (
    <h2
      id={id}
      ref={ref}
      tabIndex={tabIndex}
      className={cn("text-base font-semibold text-foreground nav:text-lg", className)}
    >
      {children}
    </h2>
  );
}
