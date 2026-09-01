import { useState, useEffect } from "react";
import { NEWS_DATA } from "@/data/news";
import type { NewsItem } from "@/types/asset";

interface UseNewsReturn {
  news: NewsItem[];
  isLoading: boolean;
  error: null | string;
}

export function useNews(): UseNewsReturn {
  const [data, setData] = useState<UseNewsReturn>({
    news: [],
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        setData({
          news: NEWS_DATA,
          isLoading: false,
          error: null,
        });
      } catch {
        setData((prev) => ({
          ...prev,
          isLoading: false,
          error: "Erro ao carregar notícias",
        }));
      }
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return data;
}
