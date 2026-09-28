import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StateTone = "neutral" | "success" | "danger";

const TONES: Record<StateTone, string> = {
  neutral: "bg-secondary text-muted-foreground",
  success: "bg-primary/10 text-primary",
  danger: "bg-destructive/10 text-destructive",
};

// Ícone dos estados vazio, de erro e de resultado: sempre num círculo de 48px. Antes havia
// três formatos (ícone solto e apagado, quadrado de 64px, círculo), um por tela.
export function StateIcon({ icon: Icon, tone = "neutral" }: { icon: LucideIcon; tone?: StateTone }) {
  return (
    <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-full", TONES[tone])}>
      <Icon size={24} aria-hidden="true" />
    </div>
  );
}
