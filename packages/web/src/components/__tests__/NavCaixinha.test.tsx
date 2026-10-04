import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MoreMenu, MORE_MENU_ROUTES } from "@/components/MoreMenu";
import { Sidebar } from "@/components/Sidebar";

describe("Caixinha nos menus", () => {
  it("menu lateral: item Caixinha na seção Dinheiro, junto de Câmbio e Transferências", () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );

    const group = screen.getByText("Dinheiro").parentElement as HTMLElement;
    const link = within(group).getByRole("link", { name: "Caixinha" });
    expect(link).toHaveAttribute("href", "/caixinha");
    expect(within(group).getByRole("link", { name: "Câmbio" })).toBeInTheDocument();
    expect(within(group).getByRole("link", { name: "Transferências" })).toBeInTheDocument();
  });

  it("celular: item Caixinha no menu Mais, que fica ativo em /caixinha", () => {
    render(
      <MemoryRouter>
        <MoreMenu />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Mais opções" }));

    expect(screen.getByRole("link", { name: "Caixinha" })).toHaveAttribute("href", "/caixinha");
    expect(MORE_MENU_ROUTES).toContain("/caixinha");
  });
});
