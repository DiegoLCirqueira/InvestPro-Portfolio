import { CONTACT_MAILTO, DEMO_NOTICE_SHORT } from "@/lib/company";

// Rodapé do mobile: uma faixa compacta que vive no fim do conteúdo rolável
// (não fica fixo na tela). O rodapé completo é só do desktop (Footer).
// mt-auto no invólucro: em página curta desce até o fim da área rolável.
export function MobileFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="nav:hidden mt-auto shrink-0 pt-8">
      <footer className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-border/50 py-4 text-xs text-muted-foreground">
        <span className="font-semibold uppercase tracking-wider text-foreground">
          InvestPro <span className="font-normal normal-case">&copy; {currentYear}</span>
        </span>
        <span className="basis-full order-last">{DEMO_NOTICE_SHORT}</span>
        <a
          href={CONTACT_MAILTO}
          className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          Contato
        </a>
      </footer>
    </div>
  );
}
