import { useEffect, useState } from "react";

const THEME_KEY = "investpro-theme";

// Cor da barra do navegador no celular (meta theme-color): o fundo de cada tema
// (--color-background), em vez de um verde escuro fixo nos dois.
const THEME_COLORS = { light: "#f6f6f4", dark: "#0e1013" } as const;

/** Aplica o tema no <html> e na barra do navegador; usado na inicialização e ao alternar. */
export function applyTheme(isDark: boolean): void {
  if (isDark) {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", isDark ? THEME_COLORS.dark : THEME_COLORS.light);
}

export function isStoredThemeDark(): boolean {
  return localStorage.getItem(THEME_KEY) === "dark";
}

export function useTheme() {
  const [isDark, setIsDark] = useState(
    () => document.documentElement.getAttribute("data-theme") === "dark",
  );

  useEffect(() => {
    applyTheme(isDark);
    localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  }, [isDark]);

  return { isDark, toggle: () => setIsDark((v) => !v) };
}
