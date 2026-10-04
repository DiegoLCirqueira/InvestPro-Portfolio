import * as React from "react";
import { Link } from "react-router-dom";
import { User, CalendarDays, LogOut } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { LogoutConfirmDialog } from "@/components/LogoutConfirmDialog";
import { useAuthStore } from "@/stores/auth";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Header() {
  const user = useAuthStore((s) => s.user);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = React.useState(false);
  const logoutButtonRef = React.useRef<HTMLButtonElement>(null);

  const dateStr = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  return (
    <header className="flex items-center gap-4 nav:gap-6">
      <div className="flex items-center gap-2 nav:hidden">
        <BrandMark />
        <span className="text-lg font-bold tracking-tight">InvestPro</span>
      </div>

      {/* Só a data: a saudação virou o título (PageHeader) do Painel, e o topo das outras
          páginas não reserva mais uma faixa vazia para ela. */}
      <div className="hidden nav:flex items-center gap-2 text-brand-primary">
        <CalendarDays size={14} aria-hidden="true" />
        <span className="text-2xs font-semibold uppercase tracking-wider">
          {dateStr}
        </span>
      </div>

      <div className="flex items-center gap-3 nav:gap-5 ml-auto">
        {/* Sem sino de notificações: o servidor não tem módulo de notificações, e o menu só dizia
            "Você não tem notificações". Volta quando houver eventos para mostrar. */}
        <ThemeToggle />

        <div className="hidden nav:flex items-center gap-4 pl-5 border-l border-border">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-foreground leading-none">
              {user?.fullName || "Investidor"}
            </p>
          </div>

          <Link
            to="/profile"
            aria-label="Perfil"
            title="Perfil"
            className="w-11 h-11 bg-linear-to-br to-secondary border border-border rounded-2xl flex items-center justify-center text-brand-primary group hover:border-brand-primary/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <User
              size={22}
              aria-hidden="true"
              className="group-hover:scale-110 transition-transform"
            />
          </Link>

          <button
            ref={logoutButtonRef}
            type="button"
            onClick={() => setConfirmLogoutOpen(true)}
            className="flex min-h-11 min-w-11 items-center justify-center text-muted-foreground hover:text-brand-danger hover:bg-secondary rounded-xl transition-colors group"
            aria-label="Sair"
            title="Sair"
          >
            <LogOut
              size={18}
              className="group-hover:scale-110 transition-transform"
            />
          </button>
        </div>
      </div>

      <LogoutConfirmDialog
        open={confirmLogoutOpen}
        onOpenChange={setConfirmLogoutOpen}
        returnFocusRef={logoutButtonRef}
      />
    </header>
  );
}
