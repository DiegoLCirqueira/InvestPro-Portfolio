import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PortfolioKpis } from "@/components/PortfolioKpis";

const BASE = {
  totalEquity: 4957.06,
  availableBalance: 2261.26,
  periodLabel: "30 dias",
};

describe("PortfolioKpis", () => {
  it("destaca o patrimônio total e mostra o saldo livre ao lado", () => {
    render(<PortfolioKpis {...BASE} returnPct={1.5} gain={73.25} />);
    expect(screen.getByText("Patrimônio total")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?4\.957,06/)).toBeInTheDocument();
    expect(screen.getByText("Saldo em conta")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?2\.261,26/)).toBeInTheDocument();
  });

  it("rendimento do período em % e em R$, avisando que depósitos não contam", () => {
    render(<PortfolioKpis {...BASE} returnPct={1.5} gain={73.25} />);
    expect(screen.getByText("Rendimento em 30 dias")).toBeInTheDocument();
    expect(screen.getByText("+1,50%")).toBeInTheDocument();
    expect(screen.getByText(/\+R\$\s?73,25/)).toBeInTheDocument();
    expect(screen.getByText(/Não conta depósitos/)).toBeInTheDocument();
  });

  it("sem base de comparação não mostra um '+0,00%' falso", () => {
    render(<PortfolioKpis {...BASE} returnPct={null} gain={null} />);
    expect(screen.queryByText(/\d+,\d{2}%/)).not.toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("variação zero aparece sem '+' e sem cor de alta", () => {
    render(<PortfolioKpis {...BASE} returnPct={0} gain={0} />);
    const value = screen.getByText("0,00%");
    expect(value.className).not.toMatch(/text-primary/);
  });
});
