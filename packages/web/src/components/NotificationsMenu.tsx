import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";

// O app ainda não tem fonte de notificações: o menu mostra um estado vazio honesto
// em vez de conteúdo inventado.
export function NotificationsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Notificações"
        aria-haspopup="true"
        aria-expanded={isOpen}
        className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Bell size={20} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-30 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-surface-1 shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Notificações
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[10px] font-semibold text-muted-foreground hover:text-foreground"
            >
              Fechar
            </button>
          </div>

          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Você não tem notificações
          </p>
        </div>
      )}
    </div>
  );
}
