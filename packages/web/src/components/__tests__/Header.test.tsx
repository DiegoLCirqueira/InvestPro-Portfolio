import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Header } from "@/components/Header";

describe("Header", () => {
  it("sem sino de notificações enquanto não houver backend de notificações", () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("button", { name: /notifica/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sair" })).toBeInTheDocument();
  });
});
