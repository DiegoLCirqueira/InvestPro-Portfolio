import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { useResetScrollOnNavigate } from "@/app/use-reset-scroll-on-navigate";

// O React Router só reseta o scroll da window; #main-content (Layout.tsx) rola por conta
// própria. Sem isto, uma página comprida rolada (ex.: Ordens) deixa a próxima rota (uma
// página curta, ex.: Diversificação) nascendo a meio caminho — o título fica cortado sob o Header.
function TestPage({ label, to }: { label: string; to?: string }) {
  useResetScrollOnNavigate();
  const navigate = useNavigate();
  return (
    <>
      <p>{label}</p>
      {to && <button onClick={() => navigate(to)}>ir para {to}</button>}
    </>
  );
}

function renderWithMainContent() {
  return render(
    <div id="main-content">
      <MemoryRouter initialEntries={["/a"]}>
        <Routes>
          <Route path="/a" element={<TestPage label="Página A" to="/b" />} />
          <Route path="/b" element={<TestPage label="Página B" />} />
        </Routes>
      </MemoryRouter>
    </div>,
  );
}

describe("useResetScrollOnNavigate", () => {
  it("zera o scroll de #main-content assim que a rota muda", async () => {
    const scrollTo = vi.fn();
    Element.prototype.scrollTo = scrollTo;

    const { findByText } = renderWithMainContent();
    expect(scrollTo).toHaveBeenCalledWith({ top: 0 });
    scrollTo.mockClear();

    (await findByText("ir para /b")).click();

    await findByText("Página B");
    expect(scrollTo).toHaveBeenCalledWith({ top: 0 });
  });

  it("não mexe no scroll se a rota não mudou (evita chamadas redundantes a cada render)", () => {
    const scrollTo = vi.fn();
    Element.prototype.scrollTo = scrollTo;

    const { rerender } = renderWithMainContent();
    scrollTo.mockClear();

    rerender(
      <div id="main-content">
        <MemoryRouter initialEntries={["/a"]}>
          <Routes>
            <Route path="/a" element={<TestPage label="Página A" to="/b" />} />
            <Route path="/b" element={<TestPage label="Página B" />} />
          </Routes>
        </MemoryRouter>
      </div>,
    );

    expect(scrollTo).not.toHaveBeenCalled();
  });
});
