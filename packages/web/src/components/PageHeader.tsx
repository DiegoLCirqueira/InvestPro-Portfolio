import type { ReactNode } from "react";

interface PageHeaderProps {
  /** Nome da página, igual ao item do menu (no Painel, a saudação). */
  title: ReactNode;
  description?: ReactNode;
  /** Controles da página (filtros, fechar), à direita do título no desktop. */
  actions?: ReactNode;
}

// Único h1 de cada página logada: o mesmo tamanho e espaçamento em todas, sem ícone
// antes do título (antes cada página tinha o seu estilo, e só algumas tinham ícone).
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="mb-6 flex shrink-0 flex-col gap-3 nav:flex-row nav:items-end nav:justify-between">
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground nav:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="min-w-0 nav:shrink-0">{actions}</div>}
    </header>
  );
}
