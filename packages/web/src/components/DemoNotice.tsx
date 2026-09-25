import { Info } from "lucide-react";
import { DEMO_NOTICE } from "@/lib/company";

// Aviso das telas de acesso (login/cadastro): onde o visitante decide se
// confia no site, fica claro que é demonstração e que não deve reutilizar
// senhas de outros serviços.
export function DemoNotice() {
  return (
    <aside
      aria-label="Aviso sobre o projeto"
      className="flex gap-2 rounded-xl border border-border bg-surface-1 p-3 text-xs text-muted-foreground"
    >
      <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
      <p>
        {DEMO_NOTICE} Não use aqui uma senha que você usa em outros serviços.
      </p>
    </aside>
  );
}
