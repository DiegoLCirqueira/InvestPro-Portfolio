import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PortfolioTotalBox } from "@/components/PortfolioTotalBox";

describe("PortfolioTotalBox", () => {
  it("mostra o patrimônio total, o que ele inclui e a rentabilidade", () => {
    render(<PortfolioTotalBox totalEquity={4957.06} change={1.5} />);
    expect(screen.getByText("Valor total do portfólio")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?4\.957,06/)).toBeInTheDocument();
    expect(screen.getByText(/\+1,50%/)).toBeInTheDocument();
    expect(
      screen.getByText(/investimentos \+ caixinha \+ moedas/),
    ).toBeInTheDocument();
  });

  it("sem base de comparação não mostra um '+0.00%' falso", () => {
    render(<PortfolioTotalBox totalEquity={1000} />);
    expect(screen.queryByText(/\d+[.,]\d{2}%/)).not.toBeInTheDocument();
  });

  it("variação zero aparece sem '+' e sem cor de alta", () => {
    render(<PortfolioTotalBox totalEquity={1000} change={0} />);
    const badge = screen.getByText("0,00%");
    expect(badge.className).not.toMatch(/text-brand-primary/);
  });
});
