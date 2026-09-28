import { useEffect, useRef, type ReactNode } from "react";
import { SectionTitle } from "@/components/SectionTitle";
import { CheckCircle2 } from "lucide-react";
import { BELOW_NAV_QUERY } from "@/hooks/use-media-query";
import { preferredScrollBehavior } from "@/lib/motion";
import { formatCurrency, formatDateTime, formatExchangeRate } from "@/lib/format";
import type { ExchangeSummary } from "@/types/exchange";
import { cardClassName } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type ExchangeResultVariant = "simulation" | "confirmation";

const VARIANT_TEXT: Record<
  ExchangeResultVariant,
  { title: string; sends: string; receives: string; date: string }
> = {
  simulation: {
    title: "Simulação",
    sends: "Você enviará",
    receives: "Você receberá (estimado)",
    date: "Cotação de",
  },
  confirmation: {
    title: "Conversão realizada",
    sends: "Você enviou",
    receives: "Você recebeu",
    date: "Data",
  },
};

function ResultRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

const detailValueClassName = "text-foreground font-semibold tabular-nums";

interface ExchangeResultCardProps {
  variant: ExchangeResultVariant;
  summary: ExchangeSummary;
  children?: ReactNode;
  /** No celular, rola até o card e foca o título quando ele aparece (fica abaixo da dobra). */
  revealOnMobile?: boolean;
}

export function ExchangeResultCard({
  variant,
  summary,
  children,
  revealOnMobile = false,
}: ExchangeResultCardProps) {
  const text = VARIANT_TEXT[variant];
  const titleRef = useRef<HTMLHeadingElement>(null);

  // No desktop o resultado já está visível ao lado do formulário: rolar lá só incomodaria.
  useEffect(() => {
    if (!revealOnMobile || !window.matchMedia(BELOW_NAV_QUERY).matches) return;
    titleRef.current?.scrollIntoView({ behavior: preferredScrollBehavior(), block: "start" });
    titleRef.current?.focus({ preventScroll: true });
  }, [revealOnMobile, summary]);

  return (
    <div className={cn(cardClassName, "flex flex-col gap-4")}>
      <SectionTitle
        ref={titleRef}
        tabIndex={-1}
        className="flex items-center gap-2 scroll-mt-4 focus:outline-none"
      >
        {variant === "confirmation" && (
          <CheckCircle2 size={18} className="text-brand-primary" aria-hidden="true" />
        )}
        {text.title}
      </SectionTitle>

      <div className="flex flex-col gap-2">
        <ResultRow label={text.sends}>
          <span className="text-foreground font-bold tabular-nums">
            {formatCurrency(summary.amount, summary.from)}
          </span>
        </ResultRow>
        <ResultRow label={text.receives}>
          <span className="text-2xl font-bold text-brand-primary tabular-nums">
            {formatCurrency(summary.convertedAmount, summary.to)}
          </span>
        </ResultRow>
      </div>

      <div className="h-px bg-border" />

      <div className="flex flex-col gap-2">
        <ResultRow label={`Taxa (${summary.from} → ${summary.to})`}>
          <span className={detailValueClassName}>{formatExchangeRate(summary.rate)}</span>
        </ResultRow>
        <ResultRow label="Taxa de serviço">
          <span className={detailValueClassName}>
            {formatCurrency(summary.fee, summary.from)}
          </span>
        </ResultRow>
        <ResultRow label={text.date}>
          <span className={detailValueClassName}>{formatDateTime(summary.at)}</span>
        </ResultRow>
      </div>

      {children}
    </div>
  );
}
