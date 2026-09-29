import { Loader2 } from "lucide-react";

// Tela neutra enquanto a sessão é restaurada pelo cookie de refresh: nem a página inicial nem o
// app, para quem está logado não ver a landing piscar antes do Painel.
export function SessionLoading() {
  return (
    <div
      role="status"
      className="flex-1 min-h-screen flex items-center justify-center bg-brand-bg"
    >
      <Loader2 size={32} className="text-brand-primary animate-spin" aria-hidden="true" />
      <span className="sr-only">Carregando…</span>
    </div>
  );
}
