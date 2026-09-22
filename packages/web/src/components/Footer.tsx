import { CONTACT_EMAIL, CONTACT_MAILTO } from "@/lib/company";

// Rodapé do DESKTOP: faixa fina e fixa no fim da tela (não entra no fluxo
// rolável), com o mínimo de conteúdo possível — 1 linha, altura definida por
// --desktop-footer-height. Diferente do mobile (MobileFooter), que é o
// rodapé completo e só aparece ao rolar até o fim do conteúdo.
export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="hidden nav:flex fixed inset-x-0 nav:left-64 bottom-0 z-30 h-[var(--desktop-footer-height)] items-center justify-between gap-4 border-t border-border/50 bg-brand-bg/95 backdrop-blur px-6 text-[10px] text-muted-foreground"
    >
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
