import { useLocation, useNavigate } from "react-router-dom";
import { User, CalendarDays, LogOut } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { NotificationsMenu } from "@/components/NotificationsMenu";
import { useAuthStore } from "@/stores/auth";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const isDashboard = location.pathname === "/";

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

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

      <div className="hidden nav:block space-y-1">
        <div className="flex items-center gap-2 text-brand-primary">
          <CalendarDays size={14} className="opacity-80" />
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-70">
            {dateStr}
          </span>
        </div>

        {/* Sempre renderizado (mesmo fora do Painel) e só ocultado por visibilidade: assim o
            espaço reservado pro header é sempre igual ao do conteúdo real, sem precisar de
            min-height fixo em px pra igualar a altura entre páginas. */}
        <h2
          className={`text-3xl font-extrabold text-foreground tracking-tight ${isDashboard ? "" : "invisible"}`}
          aria-hidden={!isDashboard}
        >
          {greeting},{" "}
          <span className="text-brand-primary">
            {user?.fullName?.split(" ")[0] || "Investidor"}
          </span>
        </h2>
      </div>

      <div className="flex items-center gap-3 nav:gap-5 ml-auto">
        <ThemeToggle />

        <NotificationsMenu />

        <div className="hidden nav:flex items-center gap-4 pl-5 border-l border-border">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-foreground leading-none">
              {user?.fullName || "Investidor"}
            </p>
          </div>

          <div
            className="w-11 h-11 bg-linear-to-br to-secondary border border-border rounded-2xl flex items-center justify-center text-brand-primary shadow-lg shadow-black/20 group cursor-pointer hover:border-brand-primary/50 transition-colors"
            onClick={() => navigate("/profile")}
            role="button"
            tabIndex={0}
          >
            <User
              size={22}
              className="group-hover:scale-110 transition-transform"
            />
          </div>

          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
            className="flex min-h-11 min-w-11 items-center justify-center text-muted-foreground hover:text-brand-danger hover:bg-secondary rounded-xl transition-all group"
            aria-label="Sair"
            title="Sair"
          >
            <LogOut size={18} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>
    </header>
  );
}
