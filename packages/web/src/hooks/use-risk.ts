import { api } from "@/services/api";
import { useQuery } from "@/hooks/use-query";
import type { RiskReport } from "@/types/risk";

export interface UseRiskOptions {
  initialData?: RiskReport;
  enabled?: boolean;
}

export function useRisk({ initialData, enabled = true }: UseRiskOptions = {}) {
  return useQuery<RiskReport>({
    fetcher: () => api.get<RiskReport>("/risk/report"),
    deps: [],
    initialData,
    enabled,
  });
}

export type { RiskReport, RiskMetricItem } from "@/types/risk";
