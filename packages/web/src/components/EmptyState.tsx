import { Link } from "react-router-dom";
import { Inbox, type LucideIcon } from "lucide-react";

interface EmptyStateAction {
  label: string;
  to?: string;
  onClick?: () => void;
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  message: string;
  action?: EmptyStateAction;
  className?: string;
}

const ACTION_CLASSNAME =
  "mt-1 min-h-11 inline-flex items-center px-4 py-2 rounded-xl bg-brand-primary text-black text-sm font-bold hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-opacity";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  message,
  action,
  className = "py-16",
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 text-center px-4 ${className}`}>
      <Icon size={28} className="text-muted-foreground/50" aria-hidden="true" />
      {title && (
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      )}
      <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
      {action &&
        (action.to ? (
          <Link to={action.to} className={ACTION_CLASSNAME}>
            {action.label}
          </Link>
        ) : (
          <button type="button" onClick={action.onClick} className={ACTION_CLASSNAME}>
            {action.label}
          </button>
        ))}
    </div>
  );
}
