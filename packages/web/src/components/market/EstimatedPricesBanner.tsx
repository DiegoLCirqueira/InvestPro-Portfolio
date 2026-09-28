import { AlertTriangle } from "lucide-react";

export function EstimatedPricesBanner() {
  return (
    <div
      role="status"
      className="mb-4 flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground"
    >
      <AlertTriangle size={18} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
      {/* A legenda da borda amarela: sem ela a marca nos itens não diria nada. */}
      <p>
        Alguns preços estão estimados: a fonte de cotações está indisponível no momento. Os ativos
        com borda amarela usam preço estimado.
      </p>
    </div>
  );
}
