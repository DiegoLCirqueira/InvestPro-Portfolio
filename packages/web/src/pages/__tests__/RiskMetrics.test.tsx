import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RiskMetrics } from "@/pages/RiskMetrics";
import type { RiskReport } from "@/types/risk";

const apiMock = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("@/services/api", async () => {
  const actual =
    await vi.importActual<typeof import("@/services/api")>("@/services/api");
  return { ...actual, api: apiMock };
});

// A API manda as métricas como proporção (0..1), como calcula o risk.service.
const report: RiskReport = {
  var95: 0.0213,
  maxDrawdown: 0.08,
  sharpe: 1.25,
  volatility: 0.2,
  concentration: 0.5002,
  score: 40,
  insufficientHistory: false,
  historyDays: 60,
  updatedAt: "2026-09-27T12:00:00.000Z",
};

function renderRisk(overrides: Partial<RiskReport> = {}) {
  apiMock.get.mockResolvedValue({ ...report, ...overrides });
  return render(
    <MemoryRouter>
      <RiskMetrics />
    </MemoryRouter>,
  );
}

describe("Risco: métricas em proporção viram porcentagem", () => {
  beforeEach(() => apiMock.get.mockReset());

  it("concentração HHI 0,5002 aparece como 50,0%, não 0,5%", async () => {
    renderRisk();

    expect(await screen.findByText("50,0%")).toBeInTheDocument();
    expect(screen.queryByText("0,5%")).not.toBeInTheDocument();
  });

  it("VaR, drawdown e volatilidade em porcentagem com 1 casa; Sharpe como número", async () => {
    renderRisk();

    expect(await screen.findByText("2,1%")).toBeInTheDocument();
    expect(screen.getByText("8,0%")).toBeInTheDocument();
    expect(screen.getByText("20,0%")).toBeInTheDocument();
    expect(screen.getByText("1,25")).toBeInTheDocument();
  });

  it("a maior posição da lista da API também aparece em %, não como proporção", async () => {
    renderRisk({ metrics: [{ metric: "Maior posição", value: 0.6123 }] });

    expect(await screen.findByText("Maior posição")).toBeInTheDocument();
    expect(screen.getByText("61,2%")).toBeInTheDocument();
    expect(screen.queryByText(/proporção/)).not.toBeInTheDocument();
  });

  it("com pouco histórico: um bloco com quanto falta, sem cards vazios, e a concentração aparece", async () => {
    renderRisk({ insufficientHistory: true, score: undefined, historyDays: 5 });

    expect(await screen.findByText("50,0%")).toBeInTheDocument();
    expect(screen.getByText(/disponíveis em cerca de 15 dias/)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "5");
    expect(screen.queryByText("VaR 95%")).not.toBeInTheDocument();
    expect(screen.queryByText("—")).not.toBeInTheDocument();
  });
});
