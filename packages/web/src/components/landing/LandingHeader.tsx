import { Link } from "react-router-dom";
import { BrandMark } from "@/components/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LANDING_CONTAINER } from "@/components/landing/layout";

const SECTION_LINKS = [
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#recursos", label: "Recursos" },
  { href: "#transparencia", label: "É seguro?" },
];

const NAV_LINK =
  "inline-flex min-h-11 items-center rounded-lg px-3.5 text-[0.9375rem] font-medium text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

// No celular fica só a marca, o tema e "Entrar": o menu de seções e "Criar conta" já aparecem
// logo abaixo, no topo da página.
export function LandingHeader() {
  return (
    <header className="border-b border-border">
      <div className={cn(LANDING_CONTAINER, "flex h-16 items-center justify-between gap-4 nav:h-20")}>
        <a
          href="#topo"
          className="flex min-h-11 items-center gap-2.5 rounded-lg text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <BrandMark />
          <span className="text-lg font-bold tracking-tight sm:text-xl">InvestPro</span>
        </a>

        <nav aria-label="Seções da página" className="hidden items-center gap-2 nav:flex">
          {SECTION_LINKS.map((link) => (
            <a key={link.href} href={link.href} className={NAV_LINK}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <Button asChild variant="outline" className="bg-surface-1">
            <Link to="/login">Entrar</Link>
          </Button>
          <Button asChild className="hidden sm:inline-flex">
            <Link to="/register">Criar conta grátis</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
