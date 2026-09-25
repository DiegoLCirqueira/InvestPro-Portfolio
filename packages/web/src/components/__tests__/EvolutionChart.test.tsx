import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EvolutionChart } from "@/components/EvolutionChart";

describe("EvolutionChart", () => {
  it("com um único dia de histórico, mostra o patrimônio e explica que a linha começa amanhã", () => {
    render(<EvolutionChart data={[{ date: "2026-09-25", balance: 1500, netFlow: 1500 }]} />);

    expect(screen.getByText(/R\$\s?1\.500,00/)).toBeInTheDocument();
    expect(screen.getByText("O histórico do seu patrimônio começa hoje.")).toBeInTheDocument();
  });

  it("sem histórico não inventa valor", () => {
    render(<EvolutionChart data={[]} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
