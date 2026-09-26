import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AccountBalanceCard } from "@/components/AccountBalanceCard";

describe("AccountBalanceCard", () => {
  it("destaca o saldo em conta (dinheiro livre), não o patrimônio total", () => {
    render(<AccountBalanceCard availableBalance={2261.26} />);
    expect(screen.getByText("Saldo em conta")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /R\$\s?2\.261,26/ })).toBeInTheDocument();
    expect(screen.queryByText(/Valor total/)).not.toBeInTheDocument();
  });
});
