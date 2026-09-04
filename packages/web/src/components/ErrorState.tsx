import { AlertTriangle, type LucideIcon } from "lucide-react";

interface ErrorStateProps {
  icon?: LucideIcon;
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  bordered?: boolean;
  className?: string;
}

export function ErrorState({
  icon: Icon = AlertTriangle,
  title = "Não foi possível carregar os dados",
  message,
  onRetry,
  retryLabel = "Tentar novamente",
  bordered = true,
  className = "min-h-[40vh]",
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 p-8 text-center ${
        bordered ? "rounded-2xl border border-border" : ""
      } ${className}`}
    >
      <Icon size={32} className="text-destructive" aria-hidden="true" />
      <h3 className="text-foreground font-semibold text-lg">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="min-h-11 px-4 py-2 rounded-xl bg-brand-primary text-black text-sm font-bold hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-opacity"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}
