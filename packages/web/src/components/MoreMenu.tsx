import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Newspaper,
  PieChart,
  Shield,
  ArrowLeftRight,
  Lightbulb,
  ShieldCheck,
  LogOut,
  User,
  Menu,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { cn } from "@/lib/utils";

interface MoreMenuItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const MORE_ITEMS: MoreMenuItem[] = [
  { to: "/news", label: "Notícias", icon: Newspaper },
  { to: "/diversification", label: "Diversificação", icon: PieChart },
  { to: "/risk", label: "Risco", icon: Shield },
  { to: "/transfers", label: "Transferências", icon: ArrowLeftRight },
  { to: "/recommendations", label: "Assistente", icon: Lightbulb },
];

const ADMIN_ITEM: MoreMenuItem = {
  to: "/admin/users",
  label: "Administração",
  icon: ShieldCheck,
};

/** Rotas cobertas pelo menu "Mais" — usado pelo BottomNav para destacar o gatilho como ativo. */
export const MORE_MENU_ROUTES = [
  "/news",
  "/diversification",
  "/risk",
  "/transfers",
  "/recommendations",
  "/admin/users",
  "/profile",
];

interface MoreMenuProps {
  active?: boolean;
}

export function MoreMenu({ active }: MoreMenuProps) {
  const [open, setOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isAdmin = user?.role === "ADMIN";
  const items = isAdmin ? [...MORE_ITEMS, ADMIN_ITEM] : MORE_ITEMS;

  React.useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          className={cn(
            "flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium transition-colors",
            active ? "text-primary" : "text-muted-foreground",
          )}
          aria-label="Mais opções"
        >
          <Menu size={22} />
          <span>Mais</span>
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-overlay/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed inset-x-0 bottom-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-xl border-t border-border bg-surface-1 pb-[env(safe-area-inset-bottom)] shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom"
        >
          <DialogPrimitive.Title className="sr-only">
            Menu de navegação
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Acesso rápido a perfil, mais seções e sair da conta.
          </DialogPrimitive.Description>

          <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-border" />

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate("/profile");
            }}
            className="flex min-h-11 w-full items-center gap-3 px-5 py-4 text-left"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-secondary text-primary">
              <User size={22} />
            </div>
            <div>
              <p className="text-sm font-bold leading-none text-foreground">
                {user?.fullName || "Investidor"}
              </p>
              <p className="mt-1.5 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">
                Premium Account
              </p>
            </div>
          </button>

          <div className="h-px bg-border" />

          <nav className="px-2 py-2">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex min-h-11 items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-secondary text-primary"
                      : "text-foreground hover:bg-secondary",
                  )
                }
              >
                <item.icon size={20} />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="h-px bg-border" />

          <button
            type="button"
            onClick={async () => {
              setOpen(false);
              await logout();
              navigate("/login");
            }}
            className="flex min-h-11 w-full items-center gap-3 px-5 py-4 text-sm font-medium text-destructive"
          >
            <LogOut size={20} />
            Sair
          </button>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
