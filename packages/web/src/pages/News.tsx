import { useState } from "react";
import { Clock, ExternalLink, ChevronLeft, ChevronRight, Newspaper } from "lucide-react";
import { NewsSkeleton } from "@/components/skeletons/NewsSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { useNewsFeed } from "@/hooks/use-news-feed";
import { formatDateShort } from "@/lib/format";
import type { NewsCategory } from "@/types/news";

const CATEGORY_FILTERS: { value: NewsCategory | "ALL"; label: string }[] = [
  { value: "ALL", label: "Todas" },
  { value: "MARKET", label: "Mercado" },
  { value: "MACRO", label: "Macro" },
  { value: "CRYPTO", label: "Cripto" },
  { value: "COMPANIES", label: "Empresas" },
  { value: "ECONOMY", label: "Economia" },
  { value: "WORLD", label: "Mundo" },
];

const CATEGORY_LABELS: Record<NewsCategory, string> = {
  MARKET: "Mercado",
  MACRO: "Macro",
  CRYPTO: "Cripto",
  COMPANIES: "Empresas",
  ECONOMY: "Economia",
  WORLD: "Mundo",
};

export function News() {
  const [filter, setFilter] = useState<NewsCategory | "ALL">("ALL");
  const [page, setPage] = useState(1);

  const {
    data,
    error,
    isLoading,
    refetch,
  } = useNewsFeed({
    category: filter === "ALL" ? undefined : filter,
    page,
  });

  const items = data?.items ?? [];
  const totalPage = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  if (isLoading) {
    return (
      <div className="flex-1 animate-in fade-in duration-300">
        <NewsSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 animate-in fade-in duration-300">
        <header className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Notícias do Mercado
          </h2>
        </header>
        <ErrorState
          title="Não foi possível carregar as notícias"
          message={error.message}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="flex-1">
      <header className="mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Notícias do Mercado
        </h2>
        <p className="text-muted-foreground text-sm">
          Fique por dentro do que move o seu dinheiro hoje.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORY_FILTERS.map((option) => (
          <button
            key={option.value}
            onClick={() => {
              setFilter(option.value);
              setPage(1);
            }}
            className={`min-h-11 text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
              filter === option.value
                ? "bg-brand-primary text-black border-brand-primary"
                : "bg-secondary/60 text-muted-foreground border-border hover:border-brand-primary/40"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4">
        {items.length === 0 ? (
          <EmptyState icon={Newspaper} message="Nenhuma notícia encontrada para esta categoria." />
        ) : (
          items.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-secondary/20 border border-border p-5 rounded-2xl hover:border-brand-primary/50 transition-all group block"
            >
              <div className="flex justify-between items-start mb-3 gap-3">
                <span className="px-2 py-0.5 bg-brand-primary/10 text-brand-primary text-[10px] font-bold rounded-full uppercase">
                  {CATEGORY_LABELS[item.category] ?? item.category}
                </span>
                <div className="flex items-center gap-3 text-muted-foreground text-xs shrink-0">
                  <span className="flex items-center gap-1.5">
                    <Clock size={12} />
                    {formatDateShort(item.publishedAt)}
                  </span>
                  <span className="hidden sm:inline text-muted-foreground">
                    {item.source}
                  </span>
                  <ExternalLink
                    size={13}
                    className="opacity-100 nav:opacity-0 nav:group-hover:opacity-100 transition-opacity text-brand-primary"
                  />
                </div>
              </div>

              <h3 className="text-lg font-semibold text-foreground group-hover:text-brand-primary transition-colors mb-2">
                {item.title}
              </h3>

              {item.summary && (
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {item.summary}
                </p>
              )}
            </a>
          ))
        )}
      </div>

      {data && data.total > data.limit && (
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-border">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="min-h-11 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary/60 border border-border text-foreground/80 text-sm font-medium hover:border-brand-primary/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ChevronLeft size={15} />
            Anterior
          </button>
          <span className="text-xs text-muted-foreground font-medium">
            Página {data.page} de {totalPage}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPage, p + 1))}
            disabled={page >= totalPage}
            className="min-h-11 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary/60 border border-border text-foreground/80 text-sm font-medium hover:border-brand-primary/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Próxima
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
