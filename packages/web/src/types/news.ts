export type NewsCategory =
  "MARKET" | "MACRO" | "CRYPTO" | "COMPANIES" | "ECONOMY" | "WORLD";

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  category: NewsCategory;
  url: string;
  publishedAt: string;
}

export interface NewsList {
  items: NewsItem[];
  total: number;
  page: number;
  limit: number;
  /** Categorias com pelo menos uma notícia; ausente em respostas antigas da API. */
  categories?: NewsCategory[];
}

export interface NewsQuery {
  page?: number;
  limit?: number;
  category?: NewsCategory;
}
