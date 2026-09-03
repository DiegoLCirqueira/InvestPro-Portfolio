import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, LineChart, BookOpen, DollarSign } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MoreMenu, MORE_MENU_ROUTES } from "./MoreMenu";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Painel", icon: LayoutDashboard },
  { to: "/market", label: "Mercado", icon: LineChart },
  { to: "/orders", label: "Ordens", icon: BookOpen },
  { to: "/exchange", label: "Câmbio", icon: DollarSign },
];

export function BottomNav() {
  const location = useLocation();
  const isMoreActive = MORE_MENU_ROUTES.some((route) =>
    location.pathname.startsWith(route),
  );

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex nav:hidden border-t border-border bg-surface-1/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
      aria-label="Navegação principal"
    >
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          className={({ isActive }) =>
            cn(
              "flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium transition-colors",
              isActive ? "text-primary" : "text-muted-foreground",
            )
          }
        >
          <item.icon size={22} />
          <span>{item.label}</span>
        </NavLink>
      ))}
      <MoreMenu active={isMoreActive} />
    </nav>
  );
}
