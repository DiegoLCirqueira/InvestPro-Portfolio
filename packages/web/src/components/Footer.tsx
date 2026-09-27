import { CONTACT_EMAIL, CONTACT_MAILTO, DEMO_NOTICE_SHORT } from "@/lib/company";

// Rodapé do DESKTOP: parte do conteúdo rolável de CADA página (como o
// MobileFooter), não uma barra fixa sobre a interface inteira — aparece só
// no fim do que foi rolado ali. Só um detalhe discreto: padding mínimo
// (py-1), pouco maior que o próprio texto (text-[10px]). mt-auto no invólucro:
// em página curta desce até o fim da área rolável; o pt garante o respiro
// acima da linha quando o conteúdo ocupa a tela toda.
export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="hidden nav:block mt-auto shrink-0 pt-4">
      <footer className="flex items-center justify-between gap-4 border-t border-border/50 py-1 text-[10px] text-muted-foreground">
        <span>
          &copy; {currentYear} InvestPro · {DEMO_NOTICE_SHORT}
        </span>
        <a
          href={CONTACT_MAILTO}
          className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          {CONTACT_EMAIL}
        </a>
      </footer>
    </div>
  );
}
