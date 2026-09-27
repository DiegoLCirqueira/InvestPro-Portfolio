import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { useDocumentTitle } from "@/app/use-document-title";

function TestPage({ to }: { to?: string }) {
  useDocumentTitle();
  const navigate = useNavigate();
  return to ? <button onClick={() => navigate(to)}>navegar</button> : null;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<TestPage to="/profile" />} />
        <Route path="/market" element={<TestPage />} />
        <Route path="/diversification" element={<TestPage />} />
        <Route path="/profile" element={<TestPage />} />
        <Route path="*" element={<TestPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("useDocumentTitle", () => {
  it.each([
    ["/", "Painel · InvestPro"],
    ["/market", "Análise de Mercado · InvestPro"],
    ["/diversification", "Diversificação · InvestPro"],
  ])('rota do menu %s vira "%s"', (path, expected) => {
    renderAt(path);
    expect(document.title).toBe(expected);
  });

  it.each([
    ["/profile", "Perfil · InvestPro"],
    ["/admin/users", "Administração · InvestPro"],
    ["/login", "Entrar · InvestPro"],
    ["/rota-desconhecida", "Página não encontrada · InvestPro"],
  ])(
    'rota fora do menu (%s) também tem título próprio: "%s"',
    (path, expected) => {
      renderAt(path);
      expect(document.title).toBe(expected);
    },
  );

  it("atualiza ao trocar de rota", async () => {
    const { findByRole } = renderAt("/");
    expect(document.title).toBe("Painel · InvestPro");

    (await findByRole("button", { name: "navegar" })).click();

    await vi.waitFor(() => expect(document.title).toBe("Perfil · InvestPro"));
  });
});
