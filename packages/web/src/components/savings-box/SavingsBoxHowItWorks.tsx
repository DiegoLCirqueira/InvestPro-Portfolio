import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { SectionTitle } from "@/components/SectionTitle";
import { cardClassName } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    title: "Deposite",
    text: "O valor sai do Saldo em conta. É dinheiro simulado: nada é cobrado.",
  },
  {
    title: "Rende",
    text: "Na simulação, a Caixinha rende 100% do CDI, ou 6% ao ano.",
  },
  {
    title: "Resgate quando quiser",
    text: "O dinheiro volta na hora para o Saldo em conta.",
  },
];

/**
 * [C] Como funciona: referência, por isso fica por último no celular. No computador tem a altura
 * do "Quanto rende" ao lado: a sobra vai para o espaço entre os passos (e não um vão só antes da
 * dica), e a dica fica no fim, alinhada ao botão do simulador.
 */
export function SavingsBoxHowItWorks() {
  return (
    <section
      aria-labelledby="caixinha-como"
      className={cn(cardClassName, "nav:col-span-2 nav:self-stretch flex flex-col gap-4")}
    >
      <SectionTitle id="caixinha-como">Como funciona</SectionTitle>
      <ol className="flex flex-col gap-4 nav:flex-1 nav:justify-between">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/8 text-sm font-semibold text-primary"
              aria-hidden="true"
            >
              {index + 1}
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold">{step.title}</span>
              <span className="text-sm text-muted-foreground">{step.text}</span>
            </div>
          </li>
        ))}
      </ol>
      <div className="flex flex-col gap-1 border-t border-border pt-4">
        <p className="text-sm text-muted-foreground">
          Faltou saldo numa compra? A Nova Ordem pode completar com a Caixinha.
        </p>
        <Link
          to="/orders"
          className="inline-flex min-h-11 items-center gap-1 self-start text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Ir para Ordens
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
