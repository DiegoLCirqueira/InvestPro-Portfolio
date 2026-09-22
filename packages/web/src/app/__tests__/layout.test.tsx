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
  it("o rodapé compacto do mobile vive DENTRO do container rolável, depois do conteúdo", () => {
    const { container } = renderLayout();
    const scrollArea = container.querySelector("#main-content") as HTMLElement;

    const page = within(scrollArea).getByText("Conteúdo da página");
    const mobileFooter = within(scrollArea).getByRole("contentinfo");

    expect(mobileFooter).toHaveTextContent(/InvestPro/);
    expect(within(mobileFooter).getByRole("link", { name: "Contato" })).toHaveAttribute(
      "href",
      "mailto:contato@investpro.com.br",
    );
    expect(page.compareDocumentPosition(mobileFooter) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("o rodapé completo do desktop fica fora do container rolável", () => {
    const { container } = renderLayout();
    const scrollArea = container.querySelector("#main-content") as HTMLElement;

    const footers = screen.getAllByRole("contentinfo", { hidden: true });
    const desktopFooter = footers.find((footer) => !scrollArea.contains(footer));

    expect(desktopFooter).toBeDefined();
    expect(within(desktopFooter as HTMLElement).getByRole("link", { name: "contato@investpro.com.br" })).toHaveAttribute(
      "href",
      "mailto:contato@investpro.com.br",
    );
  });

  it("o rodapé do desktop é fixo, de 1 linha só, sem endereço nem slogan", () => {
    const { container } = renderLayout();
    const scrollArea = container.querySelector("#main-content") as HTMLElement;
    const footers = screen.getAllByRole("contentinfo", { hidden: true });
    const desktopFooter = footers.find((footer) => !scrollArea.contains(footer)) as HTMLElement;

    expect(desktopFooter.className).toMatch(/\bfixed\b/);
    expect(desktopFooter.className).toContain("h-[var(--desktop-footer-height)]");
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
