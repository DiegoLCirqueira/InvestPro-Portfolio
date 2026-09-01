import { create } from "zustand";
import type { PortfolioPeriod } from "@/hooks/usePortfolio";

interface PortfolioState {
  selectedAssetId: number | null;
  period: PortfolioPeriod;
  setSelectedAsset: (id: number | null) => void;
  setPeriod: (period: PortfolioPeriod) => void;
}

export const usePortfolioStore = create<PortfolioState>()((set) => ({
  selectedAssetId: null,
  period: "30d",
  setSelectedAsset: (id) => set({ selectedAssetId: id }),
  setPeriod: (period) => set({ period }),
}));
