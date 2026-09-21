import { CONTACT_MAILTO } from "@/lib/company";

// Rodapé do mobile: uma faixa compacta que vive no fim do conteúdo rolável
// (não fica fixo na tela). O rodapé completo é só do desktop (Footer).
export function MobileFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="nav:hidden mt-8 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-border/50 py-4 text-xs text-muted-foreground">
      <span className="font-bold uppercase tracking-wider text-foreground">
        InvestPro <span className="font-normal normal-case">&copy; {currentYear}</span>
      </span>
      <a
        href={CONTACT_MAILTO}
        className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
      >
        Contato
      </a>
    </footer>
  );
}
