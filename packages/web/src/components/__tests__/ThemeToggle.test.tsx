import { afterEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Login } from "@/pages/Login";

afterEach(() => {
  document.documentElement.removeAttribute("data-theme");
  document.head.querySelector('meta[name="theme-color"]')?.remove();
});

describe("Tema claro/escuro na tela de login", () => {
  it("o login tem o botão de tema e ele alterna o data-theme da página", () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Mudar para tema escuro" }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    fireEvent.click(screen.getByRole("button", { name: "Mudar para tema claro" }));
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });
});

describe("barra do navegador (meta theme-color)", () => {
  it("acompanha o tema ao alternar", () => {
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Mudar para tema escuro" }));
    expect(meta.content).toBe("#0e1013");
    fireEvent.click(screen.getByRole("button", { name: "Mudar para tema claro" }));
    expect(meta.content).toBe("#f6f6f4");
  });
});
