import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Layout } from "@/app/Layout";

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={["/teste"]}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/teste" element={<p>Conteúdo da página</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("Layout", () => {
  it("os dois rodapés (mobile e desktop) vivem DENTRO do container rolável de cada página, depois do conteúdo", () => {
    // O rodapé faz parte do que foi rolado NAQUELA página (como uma aba), não
    // uma barra fixa por cima da interface inteira — por isso nenhum dos dois
    // pode ficar fora de #main-content nem usar position: fixed.
    const { container } = renderLayout();
    const scrollArea = container.querySelector("#main-content") as HTMLElement;
    const page = within(scrollArea).getByText("Conteúdo da página");
    const footers = within(scrollArea).getAllByRole("contentinfo", { hidden: true });

    expect(footers).toHaveLength(2);
    for (const footer of footers) {
      expect(footer.className).not.toMatch(/\bfixed\b/);
      expect(page.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it("o rodapé compacto do mobile mostra o link 'Contato'", () => {
    const { container } = renderLayout();
    const scrollArea = container.querySelector("#main-content") as HTMLElement;
    const mobileFooter = within(scrollArea).getAllByRole("contentinfo", { hidden: true })[0];

    expect(mobileFooter).toHaveTextContent(/InvestPro/);
    expect(within(mobileFooter).getByRole("link", { name: "Contato", hidden: true })).toHaveAttribute(
      "href",
      "mailto:contato@investpro.dev.br",
    );
  });

  it("o rodapé do desktop tem 1 linha só, com o e-mail por extenso e sem endereço nem slogan", () => {
    const { container } = renderLayout();
    const scrollArea = container.querySelector("#main-content") as HTMLElement;
    const desktopFooter = within(scrollArea).getAllByRole("contentinfo", { hidden: true })[1];

    expect(
      within(desktopFooter).getByRole("link", { name: "contato@investpro.dev.br", hidden: true }),
    ).toHaveAttribute("href", "mailto:contato@investpro.dev.br");
    expect(desktopFooter.textContent).not.toContain("Maceió");
    expect(desktopFooter.textContent).not.toContain("Plataforma inteligente");
  });

  it("os rodapés não têm itens institucionais sem destino", () => {
    const { container } = renderLayout();
    const footersText = screen
      .getAllByRole("contentinfo", { hidden: true })
      .map((footer) => footer.textContent)
      .join(" ");

    for (const deadItem of ["Sobre Nós", "Investidores", "Privacidade", "Compliance", "Políticas"]) {
      expect(footersText).not.toContain(deadItem);
    }
    expect(container.textContent).not.toContain("Premium");
  });

  it("a barra inferior de navegação está presente e nomeada", () => {
    renderLayout();

    expect(screen.getByRole("navigation", { name: "Navegação principal", hidden: true })).toBeInTheDocument();
  });
});
