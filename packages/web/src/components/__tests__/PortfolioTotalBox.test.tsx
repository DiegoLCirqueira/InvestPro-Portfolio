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
      screen.getByText(/investimentos \+ Caixinha \+ moedas/),
    ).toBeInTheDocument();
  });

  it("com o detalhamento, mostra as partes no lugar da frase", () => {
    render(
      <PortfolioTotalBox
        totalEquity={9_990.15}
        breakdown={[
          { label: "Saldo em conta", value: 8_214.36 },
          { label: "Investimentos", value: 429.3 },
          { label: "Caixinha", value: 1_000 },
          { label: "Moedas", value: 346.49 },
        ]}
      />,
    );

    expect(screen.queryByText(/investimentos \+ Caixinha/)).not.toBeInTheDocument();
    const terms = screen.getAllByRole("term").map((term) => term.textContent?.replace("· ", ""));
    expect(terms).toEqual(["Saldo em conta", "Investimentos", "Caixinha", "Moedas"]);
    expect(screen.getByText(/R\$\s?346,49/)).toBeInTheDocument();
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
