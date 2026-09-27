import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { AuthLayout } from "@/components/AuthLayout";

// Mesma moldura das telas públicas: logo, tema e rodapé do site, em vez de uma página solta.
export function NotFound() {
  return (
    <AuthLayout
      title="Página não encontrada"
      subtitle="A página que você procura não existe ou foi movida."
    >
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 flex items-center justify-center">
          <Compass className="w-8 h-8 text-brand-primary" aria-hidden="true" />
        </div>
        <p
          className="text-5xl font-black tracking-tight text-foreground"
          aria-hidden="true"
        >
          404
        </p>
        <Link
          to="/"
          className="min-h-11 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-solid hover:opacity-90 transition-opacity text-primary-foreground text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Voltar ao início
        </Link>
      </div>
    </AuthLayout>
  );
}
