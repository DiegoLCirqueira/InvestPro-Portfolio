import { ChevronDown, Info } from "lucide-react";
import { DEMO_NOTICE, DEMO_NOTICE_SHORT } from "@/lib/company";

// Aviso das telas de acesso (login/cadastro): onde o visitante decide se
// confia no site. O essencial fica sempre visível (demonstração + não reusar
// senha); o texto completo abre ao clicar, sem competir com o formulário.
// <details> nativo: teclado e leitor de tela funcionam sem JavaScript extra.
export function DemoNotice() {
  return (
    <details className="group text-xs text-muted-foreground">
      <summary className="mx-auto flex min-h-11 w-fit cursor-pointer list-none items-center justify-center gap-1.5 rounded-lg px-2 text-center hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
        <Info size={14} className="shrink-0" aria-hidden="true" />
        <span>{DEMO_NOTICE_SHORT} · não use sua senha real</span>
        <ChevronDown
          size={14}
          className="shrink-0 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <p className="mt-1 rounded-xl border border-border bg-surface-1 p-3 leading-relaxed">
        {DEMO_NOTICE} Não use aqui uma senha que você usa em outros serviços.
      </p>
    </details>
  );
}
