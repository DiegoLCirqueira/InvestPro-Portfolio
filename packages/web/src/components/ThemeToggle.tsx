import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

// Botão de tema claro/escuro: usado no Header e nas telas de acesso (login,
// cadastro, recuperação de senha), onde ainda não há Header.
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { isDark, toggle } = useTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      className={`flex min-h-11 min-w-11 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${className}`}
      aria-label={isDark ? "Mudar para tema claro" : "Mudar para tema escuro"}
      aria-pressed={isDark}
    >
      {isDark ? <Moon size={20} /> : <Sun size={20} />}
    </button>
  );
}
