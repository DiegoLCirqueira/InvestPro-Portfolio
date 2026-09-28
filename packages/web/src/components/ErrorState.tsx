import { AlertTriangle, type LucideIcon } from "lucide-react";
import { StateIcon } from "@/components/StateIcon";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  icon?: LucideIcon;
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  bordered?: boolean;
  className?: string;
}

// Mesma anatomia do EmptyState (ícone num círculo, título, texto, ação), no tom de erro.
export function ErrorState({
  icon = AlertTriangle,
  title = "Não foi possível carregar os dados",
  message,
  onRetry,
  retryLabel = "Tentar novamente",
  bordered = true,
  className = "min-h-[40vh]",
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 p-8 text-center ${
        bordered ? "rounded-2xl border border-border" : ""
      } ${className}`}
    >
      <StateIcon icon={icon} tone="danger" />
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md">{message}</p>
      {onRetry && (
        <Button type="button" onClick={onRetry} className="mt-1 h-auto min-h-11">
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
