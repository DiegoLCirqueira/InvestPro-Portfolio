import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Header } from "@/components/Header";
import { MoreMenu } from "@/components/MoreMenu";
import { useAuthStore } from "@/stores/auth";

const logoutMock = vi.fn(async () => {});
const originalLogout = useAuthStore.getState().logout;

afterEach(() => {
  logoutMock.mockClear();
  useAuthStore.setState({ logout: originalLogout });
});

function renderHeader() {
  useAuthStore.setState({ logout: logoutMock });
  render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Sair" }));
}

describe("Confirmação ao sair da conta", () => {
  it("clicar em Sair abre a confirmação sem encerrar a sessão", () => {
    renderHeader();

    expect(
      screen.getByRole("alertdialog", { name: "Tem certeza que quer sair?" }),
    ).toBeTruthy();
    expect(logoutMock).not.toHaveBeenCalled();
  });

  it("cancelar fecha a confirmação e mantém a sessão", async () => {
    renderHeader();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(logoutMock).not.toHaveBeenCalled();
  });

  it("confirmar encerra a sessão", async () => {
    renderHeader();

    const dialog = screen.getByRole("alertdialog");
    const confirm = Array.from(dialog.querySelectorAll("button")).find(
      (b) => b.textContent === "Sair",
    )!;
    fireEvent.click(confirm);

    await waitFor(() => expect(logoutMock).toHaveBeenCalledTimes(1));
  });

  it("clicar fora da confirmação não fecha (ação destrutiva)", () => {
    renderHeader();

    fireEvent.pointerDown(document.body);

    expect(screen.getByRole("alertdialog")).toBeTruthy();
  });

  it("no menu Mais, o foco fica na confirmação e volta ao Mais ao cancelar", async () => {
    useAuthStore.setState({ logout: logoutMock });
    render(
      <MemoryRouter>
        <MoreMenu />
      </MemoryRouter>,
    );
    const moreButton = screen.getByRole("button", { name: "Mais opções" });

    fireEvent.click(moreButton);
    fireEvent.click(screen.getByRole("button", { name: "Sair" }));

    const dialog = await screen.findByRole("alertdialog");
    await waitFor(() =>
      expect(dialog.contains(document.activeElement)).toBe(true),
    );
    expect(document.activeElement).not.toBe(moreButton);

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(document.activeElement).toBe(moreButton));
    expect(logoutMock).not.toHaveBeenCalled();
  });

  it("no cabeçalho, cancelar devolve o foco ao botão Sair", async () => {
    renderHeader();
    // Com o diálogo aberto, o botão do cabeçalho fica fora da árvore acessível (aria-hidden).
    const logoutButton = screen.getByTitle("Sair");

    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(document.activeElement).toBe(logoutButton);
    expect(logoutMock).not.toHaveBeenCalled();
  });
});
