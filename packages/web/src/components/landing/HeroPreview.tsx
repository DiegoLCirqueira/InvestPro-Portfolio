import type { ReactNode } from "react";
import { PiggyBank, Plus, User, Wallet } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { cn } from "@/lib/utils";

const PERIODS = ["7D", "30D", "90D", "1A"];
const SELECTED_PERIOD = "30D";

// Pontos da linha do gráfico ilustrativo (viewBox 512 x 112), subindo como no design.
const CHART_POINTS = "0,86 48,82 96,84 144,72 192,75 240,60 288,64 336,46 384,50 432,34 480,36 512,24";

const PREVIEW_ASSETS = [
  { mark: "IT", ticker: "ITUB4", detail: "Ação · 50 cotas", value: "R$ 2.106,50", tone: "bg-info/15 text-info" },
  { mark: "BT", ticker: "BTC", detail: "Cripto · comprado por valor em R$", value: "R$ 1.500,00", tone: "bg-warning/15 text-warning" },
];

const PREVIEW_CARD = "rounded-xl border border-border bg-surface-1 px-4 py-4 sm:px-5";

// Miniatura do Painel no topo da página. É ilustração (valores de exemplo): o conteúdo fica
// fora da árvore de acessibilidade e a legenda diz o que a imagem mostra.
export function HeroPreview() {
  return (
    <figure className="m-0 flex flex-col gap-3">
      <div
        aria-hidden="true"
        className="overflow-hidden rounded-2xl border border-border bg-surface-1 shadow-[0_32px_64px_-32px_rgb(21_23_27/0.3)]"
      >
        <div className="flex h-13 items-center justify-between border-b border-border px-5">
          <div className="flex items-center gap-2 text-sm">
            <BrandMark className="size-5" />
            <span className="font-bold">InvestPro</span>
            <span className="ml-2 text-muted-foreground">Painel</span>
          </div>
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <User size={14} />
          </span>
        </div>

        <div className="flex flex-col gap-3 bg-background p-3 sm:p-4">
          <div className={cn(PREVIEW_CARD, "flex items-center justify-between gap-4")}>
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground sm:text-[0.8125rem]">
                <Wallet size={14} />
                Saldo em conta
              </span>
              <span className="text-xl font-bold tracking-tight tabular-nums sm:text-2xl">R$ 1.250,00</span>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary-solid px-3.5 text-xs font-semibold text-primary-foreground sm:text-[0.8125rem]">
                <Plus size={14} />
                Adicionar saldo
              </span>
              <span className="text-xs font-semibold text-primary">
                Grátis<span className="hidden sm:inline"> · dinheiro simulado</span>
              </span>
            </div>
          </div>

          <div className={cn(PREVIEW_CARD, "flex flex-col gap-3")}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold">Evolução do Patrimônio</span>
              <span className="flex gap-0.5 rounded-lg bg-secondary p-0.5 text-xs font-semibold text-muted-foreground">
                {PERIODS.map((period) => (
                  <span
                    key={period}
                    className={cn(
                      "rounded-md px-2 py-1",
                      period === "90D" && "hidden sm:inline",
                      period === SELECTED_PERIOD && "bg-primary-solid text-primary-foreground",
                    )}
                  >
                    {period}
                  </span>
                ))}
              </span>
            </div>
            <svg viewBox="0 0 512 112" className="h-20 w-full sm:h-28" preserveAspectRatio="none">
              <defs>
                <linearGradient id="hero-preview-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="var(--color-primary)" stopOpacity="0.18" />
                  <stop offset="1" stopColor="var(--color-primary)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[28, 64, 100].map((y) => (
                <line key={y} x1="0" y1={y} x2="512" y2={y} stroke="var(--color-border)" strokeDasharray="3 4" />
              ))}
              <polygon points={`${CHART_POINTS} 512,112 0,112`} fill="url(#hero-preview-area)" />
              <polyline
                points={CHART_POINTS}
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>

          <div className={cn(PREVIEW_CARD, "flex flex-col py-2")}>
            <div className="hidden items-center justify-between py-2.5 sm:flex">
              <span className="text-sm font-bold">Seus Ativos</span>
              <span className="text-xs text-muted-foreground">
                Total <strong className="font-mono text-foreground">R$ 7.856,50</strong>
              </span>
            </div>
            {PREVIEW_ASSETS.map((asset) => (
              <AssetLine key={asset.ticker} {...asset} />
            ))}
            <AssetLine
              className="hidden sm:flex"
              mark={<PiggyBank size={16} />}
              ticker="Caixinha"
              detail="Renda fixa · 100% do CDI"
              value="R$ 3.000,00"
              tone="bg-primary/10 text-primary"
            />
          </div>
        </div>
      </div>
      <figcaption className="text-center text-xs text-muted-foreground sm:text-[0.8125rem]">
        Tela ilustrativa do Painel do simulador. Valores de exemplo.
      </figcaption>
    </figure>
  );
}

interface AssetLineProps {
  mark: ReactNode;
  ticker: string;
  detail: string;
  value: string;
  tone: string;
  className?: string;
}

function AssetLine({ mark, ticker, detail, value, tone, className }: AssetLineProps) {
  return (
    <div className={cn("flex items-center gap-3 border-t border-border py-2.5 first:border-t-0 sm:first:border-t", className)}>
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold", tone)}>
        {mark}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-bold">{ticker}</span>
        <span className="truncate text-xs text-muted-foreground">{detail}</span>
      </div>
      <span className="font-mono text-sm font-semibold">{value}</span>
    </div>
  );
}
