import { CONTACT_EMAIL, CONTACT_MAILTO } from "@/lib/company";

// Rodapé do DESKTOP: parte do conteúdo rolável de CADA página (como o
// MobileFooter), não uma barra fixa sobre a interface inteira — aparece só
// no fim do que foi rolado ali. 1 linha, o mínimo de conteúdo possível.
export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="hidden nav:flex mt-8 items-center justify-between gap-4 border-t border-border/50 py-3 text-[10px] text-muted-foreground">
      <span>
        &copy; {currentYear} <span className="font-bold text-foreground">InvestPro</span>
      </span>
      <a
        href={CONTACT_MAILTO}
        className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
      >
        {CONTACT_EMAIL}
      </a>
    </footer>
  );
}
