import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { NotificationsMenu } from "@/components/NotificationsMenu";

const openMenu = () => fireEvent.click(screen.getByRole("button", { name: "Notificações" }));

describe("NotificationsMenu", () => {
  it("mostra um estado vazio honesto, sem conteúdo inventado", () => {
    render(<NotificationsMenu />);
    openMenu();

    expect(screen.getByText("Você não tem notificações")).toBeInTheDocument();
    expect(screen.queryByText(/IBOVESPA|oportunidade|Lembrete/i)).not.toBeInTheDocument();
  });

  it("não tem indicador de 'não lida' no sino", () => {
    render(<NotificationsMenu />);

    expect(screen.getByRole("button", { name: "Notificações" }).querySelector("span")).toBeNull();
  });

  it("abre e fecha pelo sino, pelo 'Fechar', pelo Esc e clicando fora", () => {
    render(<NotificationsMenu />);
    const bell = screen.getByRole("button", { name: "Notificações" });
    expect(bell).toHaveAttribute("aria-expanded", "false");

    openMenu();
    expect(bell).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.queryByText("Você não tem notificações")).not.toBeInTheDocument();

    openMenu();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByText("Você não tem notificações")).not.toBeInTheDocument();

    openMenu();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText("Você não tem notificações")).not.toBeInTheDocument();
  });
});
