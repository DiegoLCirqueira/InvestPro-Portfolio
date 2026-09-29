import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { NotFound } from "@/pages/NotFound";

describe("Página 404", () => {
  it("tem a identidade do site (logo e botão de tema) e o caminho de volta", () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: "Página não encontrada" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Erro 404")).toBeInTheDocument();
    expect(screen.getByText("InvestPro")).toBeInTheDocument();
    // A marca das telas de acesso volta para a página inicial.
    expect(screen.getByRole("link", { name: "InvestPro" })).toHaveAttribute("href", "/");
    expect(
      screen.getByRole("button", { name: /Mudar para tema/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Voltar ao início" }),
    ).toHaveAttribute("href", "/");
  });
});
