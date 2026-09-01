import { api } from "@/services/api";
import { useQuery } from "@/hooks/use-query";
import type { NewsCategory, NewsItem, NewsList } from "@/types/news";

const NEWS_LIMIT = 12;

export interface UseNewsFeedOptions {
  category?: NewsCategory;
  page?: number;
  initialData?: NewsList;
  enabled?: boolean;
}

export function useNewsFeed({
  category,
  page = 1,
  initialData,
  enabled = true,
}: UseNewsFeedOptions = {}) {
  const query: {
    page?: number;
    limit?: number;
    category?: NewsCategory;
  } = { page, limit: NEWS_LIMIT, category };

  return useQuery<NewsList>({
    fetcher: () => api.get<NewsList>("/news", query),
    deps: [category, page],
    initialData,
    enabled,
  });
}

export type { NewsItem } from "@/types/news";
export type { NewsCategory } from "@/types/news";
