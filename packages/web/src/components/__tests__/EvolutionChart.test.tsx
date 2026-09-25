import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EvolutionChart } from "@/components/EvolutionChart";

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
    expect(screen.queryByText("O histórico do seu patrimônio começa hoje.")).not.toBeInTheDocument();
  });

  it("sem pontos suficientes: só o aviso, sem exibir o valor da conta", () => {
    render(<EvolutionChart data={ONE_DAY} intraday={[{ at: "2026-09-25T13:00:00.000Z", balance: 1500 }]} />);
    expect(screen.getByText("O histórico do seu patrimônio começa hoje.")).toBeInTheDocument();
    expect(screen.queryByText(/1.500/)).not.toBeInTheDocument();
  });
});
