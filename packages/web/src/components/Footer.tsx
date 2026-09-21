import { CONTACT_EMAIL, CONTACT_MAILTO } from "@/lib/company";

// Só o que funciona: sem links institucionais sem destino.
export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="hidden nav:block mt-auto border-t border-border/50 pt-2 pb-2 px-6">
      <div className="flex items-start justify-between gap-6 mt-4 text-[10px]">
        <div className="space-y-1">
          <h4 className="text-foreground font-bold text-[11px] uppercase tracking-wider">
            InvestPro
          </h4>
          <p className="text-muted-foreground text-[10px] leading-tight">
            Plataforma inteligente.
          </p>
          <p className="text-muted-foreground text-[9px]">&copy; {currentYear}</p>
        </div>

        <div className="space-y-1 text-right">
          <h4 className="text-foreground font-bold text-[11px] uppercase tracking-wider">
            Contato
          </h4>
          <div className="flex flex-col text-[10px] text-muted-foreground leading-tight">
            <p>Maceió, AL</p>
            <a
              href={CONTACT_MAILTO}
              className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            >
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
