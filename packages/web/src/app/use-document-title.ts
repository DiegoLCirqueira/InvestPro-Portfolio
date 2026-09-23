import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const APP_NAME = "InvestPro";

// Só as rotas do menu (Layout/Sidebar) ganham um título próprio; qualquer outra
// rota (perfil, admin, autenticação, 404...) fica só com o nome do app — sem
// inventar um label pra uma página que não está navegável pelo menu.
const PAGE_TITLES: Record<string, string> = {
  "/": "Painel",
  "/market": "Análise de Mercado",
  "/news": "Notícias",
  "/diversification": "Diversificação",
  "/risk": "Risco",
  "/orders": "Ordens",
  "/exchange": "Câmbio",
  "/transfers": "Transferências",
  "/recommendations": "Recomendações",
};

/** Título da aba do navegador conforme a rota: "<Página> · InvestPro", ou só "InvestPro". */
export function useDocumentTitle(): void {
  const { pathname } = useLocation();

  useEffect(() => {
    const pageTitle = PAGE_TITLES[pathname];
    document.title = pageTitle ? `${pageTitle} · ${APP_NAME}` : APP_NAME;
  }, [pathname]);
}
