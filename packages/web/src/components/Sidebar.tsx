import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  LineChart,
  Newspaper,
  Lightbulb,
  PieChart,
  DollarSign,
  ArrowLeftRight,
  Shield,
  BookOpen,
  ShieldCheck,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuthStore } from "@/stores/auth";

interface MenuItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

const MENU_GROUPS: MenuGroup[] = [
  {
    label: "Visão geral",
    items: [
      { to: "/", label: "Painel", icon: LayoutDashboard },
      { to: "/market", label: "Análise de Mercado", icon: LineChart },
      { to: "/news", label: "Notícias", icon: Newspaper },
    ],
  },
  {
    label: "Carteira",
    items: [
      { to: "/diversification", label: "Diversificação", icon: PieChart },
      { to: "/risk", label: "Risco", icon: Shield },
      { to: "/orders", label: "Ordens", icon: BookOpen },
    ],
  },
  {
    label: "Dinheiro",
    items: [
      { to: "/exchange", label: "Câmbio", icon: DollarSign },
      { to: "/transfers", label: "Transferências", icon: ArrowLeftRight },
      { to: "/recommendations", label: "Assistente", icon: Lightbulb },
    ],
  },
];

function menuLinkClass({ isActive }: { isActive: boolean }) {
  return `w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
    isActive
      ? "bg-gray-800/50 text-brand-primary"
      : "text-gray-500 hover:text-white hover:bg-gray-800/30"
  }`;
}

export function Sidebar() {
  const isAdmin = useAuthStore((s) => s.user?.role === "ADMIN");

  return (
    <aside className="hidden nav:flex w-64 bg-brand-bg border-r border-gray-800 flex-col fixed h-full">
      <div className="p-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center">
            <span className="text-black font-black text-xl italic">I</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">InvestPro</h1>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-6 overflow-y-auto">
        {MENU_GROUPS.map((group) => (
          <div key={group.label} className="space-y-2">
            <p className="px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600">
              {group.label}
            </p>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={menuLinkClass}
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      size={20}
                      className={isActive ? "text-brand-primary" : "group-hover:text-white"}
                    />
                    <span className="font-medium text-sm">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-gray-800 space-y-2">
        <NavLink to="/profile" className={menuLinkClass}>
          {({ isActive }) => (
            <>
              <User
                size={20}
                className={isActive ? "text-brand-primary" : "group-hover:text-white"}
              />
              <span className="font-medium text-sm">Perfil</span>
            </>
          )}
        </NavLink>
        {isAdmin ? (
          <NavLink to="/admin/users" className={menuLinkClass}>
            {({ isActive }) => (
              <>
                <ShieldCheck
                  size={20}
                  className={isActive ? "text-brand-primary" : "group-hover:text-white"}
                />
                <span className="font-medium text-sm">Administração</span>
              </>
            )}
          </NavLink>
        ) : null}
      </div>
    </aside>
  );
}
