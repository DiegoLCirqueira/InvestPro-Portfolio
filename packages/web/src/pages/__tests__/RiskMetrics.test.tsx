import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RiskMetrics } from "@/pages/RiskMetrics";

const apiMock = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("@/services/api", async () => {
  const actual =
    await vi.importActual<typeof import("@/services/api")>("@/services/api");
  return { ...actual, api: apiMock };
});

// A API manda as métricas como proporção (0..1), como calcula o risk.service.
const report = {
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

function renderRisk(overrides: Partial<typeof report> = {}) {
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

  it("VaR, drawdown e volatilidade em porcentagem; Sharpe como número", async () => {
    renderRisk();

    expect(await screen.findByText("2,13%")).toBeInTheDocument();
    expect(screen.getByText("8,00%")).toBeInTheDocument();
    expect(screen.getByText("20,00%")).toBeInTheDocument();
    expect(screen.getByText("1,25")).toBeInTheDocument();
  });

  it("com pouco histórico, as métricas de série ficam pendentes e a concentração aparece", async () => {
    renderRisk({ insufficientHistory: true, score: undefined });

    expect(await screen.findByText("50,0%")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(4);
  });
});
