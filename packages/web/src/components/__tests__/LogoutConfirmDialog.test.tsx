import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Header } from "@/components/Header";
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
      screen.getByRole("dialog", { name: "Tem certeza que quer sair?" }),
    ).toBeTruthy();
    expect(logoutMock).not.toHaveBeenCalled();
  });

  it("cancelar fecha a confirmação e mantém a sessão", async () => {
    renderHeader();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(logoutMock).not.toHaveBeenCalled();
  });

  it("confirmar encerra a sessão", async () => {
    renderHeader();

    const dialog = screen.getByRole("dialog");
    const confirm = Array.from(dialog.querySelectorAll("button")).find(
      (b) => b.textContent === "Sair",
    )!;
    fireEvent.click(confirm);

    await waitFor(() => expect(logoutMock).toHaveBeenCalledTimes(1));
  });
});
