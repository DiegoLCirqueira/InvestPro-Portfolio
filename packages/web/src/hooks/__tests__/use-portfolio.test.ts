import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import {
  usePortfolio,
  usePortfolioHistory,
} from "@/hooks/usePortfolio";
import type { PortfolioPeriod } from "@/types/portfolio";

const mockSummary = {
  id: "portfolio-1",
  balance: 175450.32,
  positions: [
    {
      id: "p1",
      ticker: "BTC",
      name: "Bitcoin",
      type: "CRYPTO",
      quantity: 0.00122611,
      avgPrice: 69573000,
      currentValue: 85400,
    },
  ],
};

const mockDiversification = {
  totalBalance: 175450.32,
  breakdown: [
    { type: "CRYPTO", label: "Criptomoedas", value: 110400, percentage: 62.92 },
  ],
};

const mockHistory = {
  history: [
    { date: "2026-01-01", balance: 150000 },
    { date: "2026-01-02", balance: 175450.32 },
  ],
};

vi.mock("@/services/api", () => ({
  api: {
    get: vi.fn(),
  },
}));

import { api } from "@/services/api";

const mockedGet = vi.mocked(api.get);

beforeEach(() => {
  mockedGet.mockReset();
});

describe("usePortfolio", () => {
  it("busca resumo e diversificação reais da API", async () => {
    mockedGet
      .mockResolvedValueOnce(mockSummary)
      .mockResolvedValueOnce(mockDiversification);

    const { result } = renderHook(() => usePortfolio());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockedGet).toHaveBeenCalledWith("/portfolio");
    expect(mockedGet).toHaveBeenCalledWith("/portfolio/diversification");
    expect(result.current.balance).toBe(175450.32);
    expect(result.current.positions).toHaveLength(1);
    expect(result.current.positions[0].ticker).toBe("BTC");
    expect(result.current.diversification?.breakdown[0].label).toBe(
      "Criptomoedas",
    );
    expect(result.current.error).toBeNull();
  });

  it("expõe o erro quando a API falha", async () => {
    mockedGet.mockRejectedValue(new Error("Serviço indisponível"));

    const { result } = renderHook(() => usePortfolio());

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toBe("Serviço indisponível");
    expect(result.current.positions).toEqual([]);
  });
});

describe("usePortfolioHistory", () => {
  it("busca o histórico pelo período informado", async () => {
    mockedGet.mockResolvedValueOnce(mockHistory);

    const { result } = renderHook(() => usePortfolioHistory({ period: "30d" }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockedGet).toHaveBeenCalledWith("/portfolio/history", {
      period: "30d",
    });
    expect(result.current.history).toHaveLength(2);
    expect(result.current.history[1].balance).toBe(175450.32);
    expect(result.current.error).toBeNull();
  });

  it("refaz a requisição quando o período muda", async () => {
    mockedGet.mockResolvedValue(mockHistory);

    const { result, rerender } = renderHook(
      ({ period }: { period: PortfolioPeriod }) =>
        usePortfolioHistory({ period }),
      { initialProps: { period: "7d" } },
    );

    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(1));
    expect(mockedGet).toHaveBeenCalledWith("/portfolio/history", {
      period: "7d",
    });

    rerender({ period: "1y" });
    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(2));
    expect(mockedGet).toHaveBeenCalledWith("/portfolio/history", {
      period: "1y",
    });

    expect(result.current.history).toHaveLength(2);
  });
});
