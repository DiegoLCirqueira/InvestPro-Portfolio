import { cn } from "@/lib/utils";

// Marca (o "P" do InvestPro). O PNG tem fundo transparente, então funciona nos
// temas claro e escuro sem caixa atrás. 128 px de origem para ficar nítido em
// telas de alta densidade quando exibido a 32 px. alt vazio de propósito: o
// nome "InvestPro" já aparece em texto ao lado, e repetir só polui o leitor de tela.
export const BRAND_MARK_SRC = "/favicon-128x128.png";

interface BrandMarkProps {
  className?: string;
}

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <img
      src={BRAND_MARK_SRC}
      alt=""
      width={32}
      height={32}
      className={cn("h-8 w-8 shrink-0 object-contain", className)}
    />
  );
}
