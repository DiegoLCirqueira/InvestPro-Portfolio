import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EvolutionChart } from "@/components/EvolutionChart";
import { evolutionAxis } from "@/lib/chart-axis";

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

describe("evolutionAxis (eixo Y do patrimônio)", () => {
  it("variação de ~1% não ocupa a altura inteira do gráfico", () => {
    const [lower, upper] = evolutionAxis(10_000, 10_100).domain;
    expect((10_100 - 10_000) / (upper - lower)).toBeLessThan(0.25);
  });

  it("marcas redondas com rótulos compactos e sem repetição", () => {
    const axis = evolutionAxis(10_000, 10_000);
    const labels = axis.ticks.map(axis.format);
    expect(new Set(labels).size).toBe(axis.ticks.length);
    expect(labels.some((label) => /^R\$\s?10\s?mil$/.test(label))).toBe(true);
    expect(labels.some((label) => /10,2\s?mil/.test(label))).toBe(true);
  });

  it("não desce abaixo de zero numa conta que começou vazia", () => {
    expect(evolutionAxis(0, 1_500).domain[0]).toBe(0);
  });

  it("acima de 1 milhão abrevia em mi", () => {
    const axis = evolutionAxis(2_000_000, 3_000_000);
    expect(axis.format(2_500_000)).toMatch(/2,5\s?mi/);
  });

  it("abaixo de mil mostra reais sem abreviar", () => {
    expect(evolutionAxis(400, 600).format(500)).toMatch(/R\$\s?500$/);
  });
});
