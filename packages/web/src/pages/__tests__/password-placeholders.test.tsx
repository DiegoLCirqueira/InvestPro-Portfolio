import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Login } from "@/pages/Login";
import { Register } from "@/pages/Register";

// "••••••" como placeholder parecia uma senha já preenchida.
describe("placeholders dos campos de senha", () => {
  it("o login pede a senha em texto legível", () => {
    render(<MemoryRouter><Login /></MemoryRouter>);
    expect(screen.getByLabelText("Senha")).toHaveAttribute("placeholder", "Sua senha");
  });

  it("o cadastro diferencia criar e repetir a senha, sem pontinhos", () => {
    render(<MemoryRouter><Register /></MemoryRouter>);
    expect(screen.getByPlaceholderText("Crie uma senha")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Repita a senha")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/•/)).not.toBeInTheDocument();
  });
});
