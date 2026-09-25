import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SummaryCard } from "@/components/SummaryCard";

describe("SummaryCard", () => {
  it("mostra o patrimônio total, o saldo disponível em conta e a rentabilidade", () => {
    render(<SummaryCard totalEquity={4957.06} availableBalance={2261.26} change={1.5} />);
    expect(screen.getByText(/R\$\s?4\.957,06/)).toBeInTheDocument();
    expect(screen.getByText(/Saldo disponível em conta/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?2\.261,26/)).toBeInTheDocument();
    expect(screen.getByText(/\+1\.50%/)).toBeInTheDocument();
  });

  it("sem base de comparação não mostra um '+0.00%' falso", () => {
    render(<SummaryCard totalEquity={1000} availableBalance={1000} />);
    expect(screen.queryByText(/\d+\.\d{2}%/)).not.toBeInTheDocument();
  });
});
