import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, User, CalendarDays, LogOut, Search, X } from "lucide-react";
import { useAuthStore } from "@/stores/auth";

interface Notification {
  id: number;
  title: string;
  text: string;
}

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const isDashboard = location.pathname === "/";
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  const dateStr = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  const notifications: Notification[] = [
    { id: 1, title: "Alerta de mercado", text: "IBOVESPA subiu +1.24% hoje." },
    {
      id: 2,
      title: "Recomendação de IA",
      text: "Nova oportunidade em ações de tecnologia.",
    },
    {
      id: 3,
      title: "Lembrete",
      text: "Revise sua diversificação este mês.",
    },
  ];

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!isNotificationsOpen) return;
      if (!notificationsRef.current) return;
      if (notificationsRef.current.contains(e.target as Node)) return;
      setIsNotificationsOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [isNotificationsOpen]);

  return (
    <>
    <header className="flex items-center gap-4 nav:gap-6 mb-6 nav:mb-10">
      <div className="flex items-center gap-2 nav:hidden">
        <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center">
          <span className="text-black font-black text-xl italic">I</span>
        </div>
        <span className="text-lg font-bold tracking-tight">InvestPro</span>
      </div>

      <div className="hidden nav:block space-y-1">
        <div className="flex items-center gap-2 text-brand-primary">
          <CalendarDays size={14} className="opacity-80" />
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-70">
            {dateStr}
          </span>
        </div>

        {isDashboard ? (
          <>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              {greeting},{" "}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-white to-gray-500">
                {user?.fullName?.split(" ")[0] || "Investidor"}
              </span>
            </h2>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse"></span>
              <p className="text-gray-500 text-xs font-medium">
                Seu portfólio rendeu{" "}
                <span className="text-brand-primary">+2.28%</span> nas últimas
                24h.
              </p>
            </div>
          </>
        ) : null}
      </div>

      <div className="hidden nav:flex w-full max-w-xs">
        <div className="relative w-full">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            placeholder="Buscar..."
            className="w-full rounded-xl border border-border bg-surface-1 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div
        className="flex items-center gap-3 nav:gap-5 relative ml-auto"
        ref={notificationsRef}
      >
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all nav:hidden"
          aria-label="Buscar"
        >
          <Search size={20} />
        </button>

        <button
          onClick={() => setIsNotificationsOpen((v) => !v)}
          className="flex min-h-11 min-w-11 items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-xl transition-all relative group"
          type="button"
          aria-label="Notificações"
        >
          <Bell size={20} />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-brand-primary rounded-full border-2 border-brand-bg group-hover:scale-110 transition-transform"></span>
        </button>

        {isNotificationsOpen ? (
          <div className="absolute right-0 top-12 w-80 rounded-2xl border border-gray-800 bg-[#0b1220] shadow-2xl overflow-hidden z-30">
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
                Notificações
              </span>
              <button
                className="text-[10px] text-gray-500 hover:text-white font-semibold"
                type="button"
                onClick={() => setIsNotificationsOpen(false)}
              >
                Fechar
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className="px-4 py-3 border-b border-gray-800/70 last:border-0 hover:bg-gray-900/40 transition-colors"
                >
                  <p className="text-xs font-bold text-white mb-1">{n.title}</p>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {n.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="hidden nav:flex items-center gap-4 pl-5 border-l border-gray-800">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-white leading-none">
              {user?.fullName || "Investidor"}
            </p>
            <div className="flex items-center justify-end gap-1.5 mt-1">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">
                Premium Account
              </p>
            </div>
          </div>

          <div
            className="w-11 h-11 bg-linear-to-br to-gray-900 border border-gray-700 rounded-2xl flex items-center justify-center text-brand-primary shadow-lg shadow-black/20 group cursor-pointer hover:border-brand-primary/50 transition-colors"
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
            className="flex min-h-11 min-w-11 items-center justify-center text-gray-400 hover:text-brand-danger hover:bg-gray-800/50 rounded-xl transition-all group"
            aria-label="Sair"
            title="Sair"
          >
            <LogOut size={18} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>
    </header>

    {isSearchOpen ? (
      <div className="fixed inset-0 z-50 flex flex-col bg-background nav:hidden">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <div className="relative flex-1">
            <Search
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              autoFocus
              type="search"
              placeholder="Buscar..."
              className="w-full rounded-xl border border-border bg-surface-1 py-2.5 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            type="button"
            onClick={() => setIsSearchOpen(false)}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground"
            aria-label="Fechar busca"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    ) : null}
    </>
  );
}
