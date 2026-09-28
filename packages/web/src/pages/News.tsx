import { useEffect, useRef, useState } from "react";
import {
  Clock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Newspaper,
} from "lucide-react";
import { NewsSkeleton } from "@/components/skeletons/NewsSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { FilterChips } from "@/components/FilterChips";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
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
  const topRef = useRef<HTMLDivElement>(null);

  const { data, error, isLoading, refetch } = useNewsFeed({
    category: filter === "ALL" ? undefined : filter,
    page,
  });

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [page]);

  const items = data?.items ?? [];
  // Só filtros com notícia (mais o selecionado, para não sumir enquanto está ativo).
  const availableCategories = data?.categories;
  const visibleFilters = availableCategories
    ? CATEGORY_FILTERS.filter(
        (option) =>
          option.value === "ALL" ||
          option.value === filter ||
          availableCategories.includes(option.value),
      )
    : CATEGORY_FILTERS;
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
        <PageHeader title="Notícias" />
        <ErrorState
          title="Não foi possível carregar as notícias"
          message={error.message}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div ref={topRef} className="flex-1">
      <PageHeader
        title="Notícias"
        description="Fique por dentro do que move o seu dinheiro hoje."
      />

      <div className="mb-6">
        <FilterChips
          options={visibleFilters}
          value={filter}
          onChange={(value) => {
            setFilter(value);
            setPage(1);
          }}
          ariaLabel="Filtrar notícias por categoria"
        />
      </div>

      <div className="grid gap-4">
        {items.length === 0 ? (
          <EmptyState
            icon={Newspaper}
            message="Nenhuma notícia encontrada para esta categoria."
          />
        ) : (
          items.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-secondary/20 border border-border p-5 rounded-2xl hover:border-brand-primary/50 transition-all group block"
            >
              <div className="flex flex-wrap justify-between items-start mb-3 gap-x-3 gap-y-2">
                <span className="px-2 py-0.5 bg-brand-primary/10 text-brand-primary text-2xs font-semibold rounded-full uppercase tracking-wide">
                  {CATEGORY_LABELS[item.category] ?? item.category}
                </span>
                <div className="flex min-w-0 items-center gap-3 text-muted-foreground text-xs">
                  <span className="flex items-center gap-1.5">
                    <Clock size={12} />
                    <span className="min-w-[64px] text-right tabular-nums">
                      {formatDateShort(item.publishedAt)}
                    </span>
                  </span>
                  {/* A fonte aparece também no celular (antes sumia), truncada se for longa. */}
                  <span className="max-w-[9rem] sm:max-w-none sm:min-w-[140px] truncate text-muted-foreground">
                    {item.source}
                  </span>
                  <ExternalLink
                    size={13}
                    className="opacity-100 nav:opacity-0 nav:group-hover:opacity-100 transition-opacity text-brand-primary"
                  />
                </div>
              </div>

              <h2 className="text-lg font-semibold text-foreground group-hover:text-brand-primary transition-colors mb-2">
                {item.title}
              </h2>

              {/* ~70 caracteres por linha e 2 linhas: no desktop o resumo corria por ~1.300px. */}
              {item.summary && (
                <p className="text-muted-foreground text-sm leading-relaxed max-w-[70ch] line-clamp-2">
                  {item.summary}
                </p>
              )}
            </a>
          ))
        )}
      </div>

      {data && data.total > data.limit && (
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft size={15} />
            Anterior
          </Button>
          <span className="text-xs text-muted-foreground font-medium">
            Página {data.page} de {totalPage}
          </span>
          <Button
            type="button"
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPage, p + 1))}
            disabled={page >= totalPage}
          >
            Próxima
            <ChevronRight size={15} />
          </Button>
        </div>
      )}
    </div>
  );
}
