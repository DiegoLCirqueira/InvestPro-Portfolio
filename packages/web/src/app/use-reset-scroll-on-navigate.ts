import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const MAIN_CONTENT_ID = "main-content";

/**
 * O React Router só reseta o scroll da window; #main-content (Layout.tsx) tem rolagem
 * própria. Sem isto, trocar de rota com uma posição de scroll herdada (ex.: Ordens rolado
 * bem pra baixo, depois Diversificação, que é curta) deixa a página nova nascendo a meio
 * caminho — o título aparece cortado sob o Header.
 */
export function useResetScrollOnNavigate(): void {
  const { pathname } = useLocation();

  useEffect(() => {
    document.getElementById(MAIN_CONTENT_ID)?.scrollTo({ top: 0 });
  }, [pathname]);
}
