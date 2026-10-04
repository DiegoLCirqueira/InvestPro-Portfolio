import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";

const APP_NAME = "InvestPro";

// Um título por página, igual ao nome que aparece no topo dela. Roda no nível do App
// (não só no Layout logado): senão, ao sair da conta, a aba de /login ficava com o
// título da última página interna.
const PAGE_TITLES: Record<string, string> = {
  "/": "Painel",
  "/market": "Análise de Mercado",
  "/news": "Notícias",
  "/diversification": "Diversificação",
  "/risk": "Risco",
  "/orders": "Ordens",
  "/exchange": "Câmbio",
  "/transfers": "Transferências",
  "/caixinha": "Caixinha",
  "/recommendations": "Recomendações",
  "/profile": "Perfil",
  "/profile/investor-profile": "Perfil de investidor",
  "/admin/users": "Administração",
  "/login": "Entrar",
  "/register": "Criar conta",
  "/forgot-password": "Esqueceu a senha",
  "/reset-password": "Redefinir senha",
};

const NOT_FOUND_TITLE = "Página não encontrada";

// "/" é a página inicial para quem não entrou: a marca vem primeiro, como nos resultados de busca.
const LANDING_DOCUMENT_TITLE = `${APP_NAME} · Simulador de investimentos`;

/** Título da aba do navegador conforme a rota: "<Página> · InvestPro". */
export function useDocumentTitle(): void {
  const { pathname } = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (pathname === "/" && !isAuthenticated) {
      document.title = LANDING_DOCUMENT_TITLE;
      return;
    }
    const pageTitle = PAGE_TITLES[pathname] ?? NOT_FOUND_TITLE;
    document.title = `${pageTitle} · ${APP_NAME}`;
  }, [pathname, isAuthenticated]);
}
