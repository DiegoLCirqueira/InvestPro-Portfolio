import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardHeader } from "@/pages/Dashboard";

const percentIn = (pattern: RegExp) => screen.getByText(pattern);

describe("DashboardHeader: rentabilidade do período", () => {
  it("queda em vermelho (destrutivo), não em verde", () => {
    render(<DashboardHeader change={-0.04} />);

    expect(screen.getByText(/recuou/)).toBeInTheDocument();
    expect(percentIn(/-0,04%/)).toHaveClass("text-destructive");
  });

  it("alta em verde", () => {
    render(<DashboardHeader change={1.5} />);

    expect(percentIn(/\+1,50%/)).toHaveClass("text-brand-primary");
  });

  it("zero neutro", () => {
    render(<DashboardHeader change={0} />);

    expect(percentIn(/0,00%/)).toHaveClass("text-muted-foreground");
  });
});
