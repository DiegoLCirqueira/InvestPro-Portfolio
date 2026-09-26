import type { ReactNode } from "react";
import { BrandMark } from "@/components/BrandMark";
import { DemoNotice } from "@/components/DemoNotice";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CONTACT_EMAIL, CONTACT_MAILTO } from "@/lib/company";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Link de troca de tela ("Não tem conta? Criar conta"), no rodapé do card. */
  footer: ReactNode;
  /** Aviso de demonstração: nas telas onde o visitante digita uma senha nova ou existente. */
  showDemoNotice?: boolean;
}

// Moldura das telas de acesso (login, cadastro, recuperação de senha): card
// centralizado sobre um fundo com a cor da marca, igual nos dois temas porque
// usa só os tokens do tema ativo.
export function AuthLayout({ title, subtitle, children, footer, showDemoNotice = false }: AuthLayoutProps) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-background">
      <AuthBackdrop />

      <header className="flex h-16 items-center justify-between px-4 sm:px-8">
        <div className="flex items-center gap-2.5">
          <BrandMark />
          <span className="text-lg font-bold tracking-tight text-foreground">InvestPro</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-110 space-y-4">
          <section className="rounded-3xl border border-border bg-surface-1/90 p-6 shadow-[0_24px_64px_-32px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-10">
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>

            <div className="mt-8">{children}</div>

            <div className="mt-8 border-t border-border pt-6 text-center text-sm text-muted-foreground">
              {footer}
            </div>
          </section>

          {showDemoNotice && <DemoNotice />}
        </div>
      </main>

      <footer className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-6 text-xs text-muted-foreground">
        <span>&copy; {currentYear} InvestPro</span>
        <span aria-hidden="true">·</span>
        <a
          href={CONTACT_MAILTO}
          className="rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {CONTACT_EMAIL}
        </a>
      </footer>
    </div>
  );
}

// Brilho da cor da marca no topo + grade sutil que some nas bordas.
function AuthBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,color-mix(in_srgb,var(--color-primary)_22%,transparent),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_90%_100%,color-mix(in_srgb,var(--color-accent)_12%,transparent),transparent_70%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(var(--color-border)_1px,transparent_1px),linear-gradient(90deg,var(--color-border)_1px,transparent_1px)] bg-size-[56px_56px] opacity-60 mask-[radial-gradient(ellipse_70%_55%_at_50%_0%,black,transparent)]" />
    </div>
  );
}
