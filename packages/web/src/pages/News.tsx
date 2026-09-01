import { useState } from "react";
import { Clock, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { NewsSkeleton } from "@/components/skeletons/NewsSkeleton";
import { useNewsFeed } from "@/hooks/use-news-feed";
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

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
          <h2 className="text-2xl font-bold text-white mb-2">
            Notícias do Mercado
          </h2>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 rounded-2xl border border-gray-800">
          <h3 className="text-white font-semibold text-lg">
            Não foi possível carregar as notícias
          </h3>
          <p className="text-sm text-gray-500 text-center max-w-md">
            {error.message}
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 rounded-xl bg-brand-primary text-black text-sm font-bold hover:opacity-90 transition-opacity"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1">
      <header className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">
          Notícias do Mercado
        </h2>
        <p className="text-gray-400 text-sm">
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
            className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border transition-colors ${
              filter === option.value
                ? "bg-brand-primary text-black border-brand-primary"
                : "bg-gray-900/60 text-gray-400 border-gray-800 hover:border-brand-primary/40"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4">
        {items.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-16">
            Nenhuma notícia encontrada para esta categoria.
          </p>
        ) : (
          items.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gray-800/20 border border-gray-800 p-5 rounded-2xl hover:border-brand-primary/50 transition-all group block"
            >
              <div className="flex justify-between items-start mb-3 gap-3">
                <span className="px-2 py-0.5 bg-brand-primary/10 text-brand-primary text-[10px] font-bold rounded-full uppercase">
                  {CATEGORY_LABELS[item.category] ?? item.category}
                </span>
                <div className="flex items-center gap-3 text-gray-500 text-xs shrink-0">
                  <span className="flex items-center gap-1.5">
                    <Clock size={12} />
                    {formatDate(item.publishedAt)}
                  </span>
                  <span className="hidden sm:inline text-gray-600">
                    {item.source}
                  </span>
                  <ExternalLink
                    size={13}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-brand-primary"
                  />
                </div>
              </div>

              <h3 className="text-lg font-semibold text-white group-hover:text-brand-primary transition-colors mb-2">
                {item.title}
              </h3>

              {item.summary && (
                <p className="text-gray-400 text-xs leading-relaxed">
                  {item.summary}
                </p>
              )}
            </a>
          ))
        )}
      </div>

      {data && data.total > data.limit && (
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-gray-800">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-900/60 border border-gray-800 text-gray-300 text-sm font-medium hover:border-brand-primary/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={15} />
            Anterior
          </button>
          <span className="text-xs text-gray-500 font-medium">
            Página {data.page} de {totalPage}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPage, p + 1))}
            disabled={page >= totalPage}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-900/60 border border-gray-800 text-gray-300 text-sm font-medium hover:border-brand-primary/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Próxima
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
