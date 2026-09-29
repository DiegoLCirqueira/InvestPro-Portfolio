import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Landing } from "@/pages/Landing";

function renderLanding() {
  return render(
    <MemoryRouter>
      <Landing />
    </MemoryRouter>,
  );
}

describe("Landing (página inicial para visitantes)", () => {
  it("tem um único h1 com a proposta e os landmarks da página", () => {
    renderLanding();

    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("Aprenda a investir sem arriscar o seu dinheiro.");
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("os CTAs levam ao cadastro e ao login", () => {
    renderLanding();

    const signUps = screen.getAllByRole("link", { name: "Criar conta grátis" });
    expect(signUps.length).toBeGreaterThanOrEqual(2);
    for (const link of signUps) expect(link).toHaveAttribute("href", "/register");

    const logins = [
      ...screen.getAllByRole("link", { name: "Entrar" }),
      ...screen.getAllByRole("link", { name: "Já tenho conta · Entrar" }),
    ];
    for (const link of logins) expect(link).toHaveAttribute("href", "/login");
  });

  it("o menu de seções aponta para âncoras que existem na página", () => {
    const { container } = renderLanding();

    const nav = screen.getByRole("navigation", { name: "Seções da página" });
    for (const link of within(nav).getAllByRole("link")) {
      const target = link.getAttribute("href")!;
      expect(target).toMatch(/^#/);
      expect(container.querySelector(target)).not.toBeNull();
    }
  });

  it("deixa claro que é simulado e não cita valores que não existem mais", () => {
    renderLanding();

    expect(screen.getByRole("heading", { name: /Nenhum dinheiro real sai da sua conta/ })).toBeInTheDocument();
    expect(screen.getByText(/até R\$ 3 milhões no total/)).toBeInTheDocument();
    expect(screen.queryByText(/10\.000/)).not.toBeInTheDocument();
  });

  it("a miniatura do Painel é ilustração: fora da árvore de acessibilidade, com legenda", () => {
    renderLanding();

    const caption = screen.getByText("Tela ilustrativa do Painel do simulador. Valores de exemplo.");
    const figure = caption.closest("figure")!;
    expect(figure.querySelector("[aria-hidden='true']")).toHaveTextContent("R$ 1.250,00");
  });
});
