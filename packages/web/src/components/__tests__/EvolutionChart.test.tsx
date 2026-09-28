import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EvolutionChart } from "@/components/EvolutionChart";
import { axisCurrencyFormatter } from "@/lib/chart-axis";

const ONE_DAY = [{ date: "2026-09-25", balance: 1500, netFlow: 1500 }];

describe("EvolutionChart", () => {
  it("1º dia com evolução dentro do dia: desenha a linha (sem o aviso)", () => {
    render(
      <EvolutionChart
        data={ONE_DAY}
        intraday={[
          { at: "2026-09-25T12:00:00.000Z", balance: 0 },
          { at: "2026-09-25T13:00:00.000Z", balance: 1500 },
        ]}
      />,
    );
    expect(
      screen.queryByText("O histórico do seu patrimônio começa hoje."),
    ).not.toBeInTheDocument();
  });

  it("sem pontos suficientes: só o aviso, sem exibir o valor da conta", () => {
    render(
      <EvolutionChart
        data={ONE_DAY}
        intraday={[{ at: "2026-09-25T13:00:00.000Z", balance: 1500 }]}
      />,
    );
    expect(
      screen.getByText("O histórico do seu patrimônio começa hoje."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/1.500/)).not.toBeInTheDocument();
  });
});

describe("axisCurrencyFormatter (eixo Y do patrimônio)", () => {
  it("variação pequena mostra centavos, para os rótulos não se repetirem", () => {
    const axis = axisCurrencyFormatter(9_998.9, 10_000.25);
    const labels = [9_999, 9_999.5, 10_000].map(axis.format);
    expect(new Set(labels).size).toBe(3);
    expect(labels[1]).toMatch(/9\.999,50/);
  });

  it("variação normal usa reais inteiros com milhar", () => {
    expect(axisCurrencyFormatter(10_000, 10_500).format(10_110)).toMatch(
      /R\$\s?10\.110$/,
    );
  });

  it("acima de 1 milhão abrevia só se a variação for grande", () => {
    expect(
      axisCurrencyFormatter(2_000_000, 3_000_000).format(3_010_000),
    ).toMatch(/3,01\s?mi/);
    const flat = axisCurrencyFormatter(3_010_000, 3_010_020);
    expect(flat.format(3_010_010)).not.toMatch(/mi/);
  });
});
