import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { AuthLayout } from "@/components/AuthLayout";
import { StateIcon } from "@/components/StateIcon";
import { Button } from "@/components/ui/button";

// Mesma moldura das telas públicas: logo, tema e rodapé do site, em vez de uma página solta.
// O "404" é um rótulo pequeno acima do título (antes vinha grande, depois do ícone).
export function NotFound() {
  return (
    <AuthLayout
      eyebrow="Erro 404"
      title="Página não encontrada"
      subtitle="A página que você procura não existe ou foi movida."
    >
      <div className="flex flex-col items-center gap-6 text-center">
        <StateIcon icon={Compass} />
        <Button asChild>
          <Link to="/">Voltar ao início</Link>
        </Button>
      </div>
    </AuthLayout>
  );
}
