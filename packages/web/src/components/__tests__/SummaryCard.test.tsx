import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SummaryCard } from "@/components/SummaryCard";

describe("SummaryCard", () => {
  it("mostra o patrimônio total e a rentabilidade do período", () => {
    render(<SummaryCard totalEquity={4957.06} change={1.5} />);
    expect(screen.getByText(/R\$\s?4\.957,06/)).toBeInTheDocument();
    expect(screen.getByText(/\+1\.50%/)).toBeInTheDocument();
  });

  it("sem base de comparação não mostra um '+0.00%' falso", () => {
    render(<SummaryCard totalEquity={1000} />);
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });
});
