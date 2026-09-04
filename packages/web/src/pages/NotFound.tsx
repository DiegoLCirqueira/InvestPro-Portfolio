import { Link } from "react-router-dom";
import { Compass } from "lucide-react";

export function NotFound() {
  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6 text-foreground">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-primary/10 flex items-center justify-center">
          <Compass className="w-8 h-8 text-brand-primary" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <h1 className="text-5xl font-black tracking-tight text-foreground">404</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            A página que você procura não existe ou foi movida.
          </p>
        </div>

        <Link
          to="/"
          className="min-h-11 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary hover:opacity-90 transition-opacity text-black text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
