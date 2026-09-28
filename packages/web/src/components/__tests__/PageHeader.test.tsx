import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageHeader } from "@/components/PageHeader";

describe("PageHeader", () => {
  it("mostra o título como o h1 da página, com descrição e ações", () => {
    render(
      <PageHeader
        title="Ordens"
        description="Envie e acompanhe suas ordens."
        actions={<button type="button">Filtrar</button>}
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Ordens" })).toBeInTheDocument();
    expect(screen.getByText("Envie e acompanhe suas ordens.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filtrar" })).toBeInTheDocument();
  });
});
