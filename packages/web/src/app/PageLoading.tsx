import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageLoadingProps {
  /** Tela inteira (páginas fora do app, como o login); sem ele, só a área de conteúdo. */
  fullScreen?: boolean;
}

// Carregamento neutro (spinner + "Carregando…" para leitor de tela): enquanto o código da página
// baixa ou a sessão é restaurada. Nunca um texto de erro, que só cabe ao ErrorBoundary.
export function PageLoading({ fullScreen = false }: PageLoadingProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex-1 flex items-center justify-center",
        fullScreen ? "min-h-screen bg-brand-bg" : "min-h-[40vh]",
      )}
    >
      <Loader2 size={32} className="text-brand-primary animate-spin" aria-hidden="true" />
      <span className="sr-only">Carregando…</span>
    </div>
  );
}
