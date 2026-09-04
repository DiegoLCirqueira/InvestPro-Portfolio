export type StatusTone =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral"
  | "purple";

const TONE_CLASSES: Record<StatusTone, string> = {
  success: "bg-brand-primary/15 text-brand-primary",
  warning: "bg-warning/15 text-warning",
  danger: "bg-destructive/15 text-destructive",
  info: "bg-info/15 text-info",
  neutral: "bg-secondary text-muted-foreground",
  purple: "bg-purple-500/15 text-purple-400",
};

interface StatusBadgeProps {
  label: string;
  tone: StatusTone;
}

export function StatusBadge({ label, tone }: StatusBadgeProps) {
  return (
    <span
      className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-tighter ${TONE_CLASSES[tone]}`}
    >
      {label}
    </span>
  );
}
