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
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface MenuItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const menuItems: MenuItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/market", label: "Análise de Mercado", icon: LineChart },
  { to: "/news", label: "Notícias", icon: Newspaper },
  { to: "/recommendations", label: "Recomendações", icon: Lightbulb },
  { to: "/diversification", label: "Diversificação", icon: PieChart },
  { to: "/risk", label: "Risco", icon: Shield },
  { to: "/exchange", label: "Câmbio", icon: DollarSign },
  { to: "/orders", label: "Ordens", icon: BookOpen },
  { to: "/transfers", label: "Transferências", icon: ArrowLeftRight },
];

export function Sidebar() {
  return (
    <aside className="w-64 bg-brand-bg border-r border-gray-800 flex flex-col fixed h-full">
      <div className="p-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center">
            <span className="text-black font-black text-xl italic">I</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">InvestPro</h1>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive
                  ? "bg-gray-800/50 text-brand-primary"
                  : "text-gray-500 hover:text-white hover:bg-gray-800/30"
              }`
            }
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
      </nav>
    </aside>
  );
}
