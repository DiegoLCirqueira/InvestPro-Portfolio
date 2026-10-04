import type { MouseEvent } from "react";
import { Link } from "react-router-dom";
import { Inbox, type LucideIcon } from "lucide-react";
import { StateIcon } from "@/components/StateIcon";
import { Button } from "@/components/ui/button";

interface EmptyStateAction {
  label: string;
  to?: string;
  /** Recebe o clique (ex.: para guardar o botão e devolver o foco a ele depois). */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  message: string;
  action?: EmptyStateAction;
  className?: string;
}

// Anatomia única de estado vazio: ícone num círculo, título, texto e ação como <Button>.
export function EmptyState({
  icon = Inbox,
  title,
  message,
  action,
  className = "py-16",
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 text-center px-4 ${className}`}>
      <StateIcon icon={icon} />
      {title && (
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
      )}
      <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
      {action &&
        (action.to ? (
          <Button asChild className="mt-1">
            <Link to={action.to}>{action.label}</Link>
          </Button>
        ) : (
          <Button type="button" onClick={action.onClick} className="mt-1">
            {action.label}
          </Button>
        ))}
    </div>
  );
}
